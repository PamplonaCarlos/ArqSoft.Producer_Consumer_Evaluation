import { Kafka, Admin } from 'kafkajs';
import { PrometheusMetrics } from './prometheus-metrics';

export interface BrokerInfo {
    nodeId: number;
    host: string;
    port: number;
}

export interface TopicInfo {
    name: string;
    partitions: Array<{
        partitionId: number;
        leader: number;
        replicas: number[];
        isr: number[];
    }>;
}

export interface ConsumerGroupInfo {
    groupId: string;
    state: string;
    members: Array<{
        memberId: string;
        clientId: string;
        clientHost: string;
    }>;
}

export interface TopicOffset {
    topic: string;
    partition: number;
    offset: string;
    high: string;
    low: string;
}

export class KafkaMonitor {
    private kafka: Kafka;
    private admin: Admin;
    private metrics: PrometheusMetrics;
    private isConnected = false;
    private monitoringInterval?: NodeJS.Timeout;

    constructor(brokers: string[], metrics: PrometheusMetrics) {
        this.kafka = new Kafka({
            clientId: 'kafka-monitor',
            brokers,
        });
        this.admin = this.kafka.admin();
        this.metrics = metrics;
    }

    public async connect(): Promise<void> {
        try {
            console.log('🔌 Conectando monitor ao Kafka...');
            await this.admin.connect();
            this.isConnected = true;
            console.log('✅ Monitor conectado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao conectar monitor:', error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        try {
            if (this.monitoringInterval) {
                clearInterval(this.monitoringInterval);
            }
            if (this.isConnected) {
                await this.admin.disconnect();
                this.isConnected = false;
                console.log('🔌 Monitor desconectado');
            }
        } catch (error) {
            console.error('❌ Erro ao desconectar monitor:', error);
            throw error;
        }
    }

    public async getBrokers(): Promise<BrokerInfo[]> {
        if (!this.isConnected) {
            throw new Error('Monitor não está conectado');
        }

        const metadata = await this.admin.fetchMetadata();
        return metadata.brokers.map(broker => ({
            nodeId: broker.nodeId,
            host: broker.host,
            port: broker.port,
        }));
    }

    public async getTopics(): Promise<TopicInfo[]> {
        if (!this.isConnected) {
            throw new Error('Monitor não está conectado');
        }

        const metadata = await this.admin.fetchMetadata();
        return metadata.topics.map(topic => ({
            name: topic.name,
            partitions: topic.partitions.map(partition => ({
                partitionId: partition.partitionId,
                leader: partition.leader,
                replicas: partition.replicas,
                isr: partition.isr,
            })),
        }));
    }

    public async getConsumerGroups(): Promise<ConsumerGroupInfo[]> {
        if (!this.isConnected) {
            throw new Error('Monitor não está conectado');
        }

        const groups = await this.admin.listGroups();
        const groupsInfo: ConsumerGroupInfo[] = [];

        for (const group of groups.groups) {
            try {
                const description = await this.admin.describeGroups([group.groupId]);
                const groupInfo = description.groups[0];

                groupsInfo.push({
                    groupId: group.groupId,
                    state: groupInfo.state,
                    members: groupInfo.members.map(member => ({
                        memberId: member.memberId,
                        clientId: member.clientId,
                        clientHost: member.clientHost,
                    })),
                });
            } catch (error) {
                console.warn(`⚠️ Erro ao obter detalhes do grupo ${group.groupId}:`, error);
            }
        }

        return groupsInfo;
    }

    public async getTopicOffsets(topicName: string): Promise<TopicOffset[]> {
        if (!this.isConnected) {
            throw new Error('Monitor não está conectado');
        }

        const offsets = await this.admin.fetchTopicOffsets(topicName);
        return offsets.map(offset => ({
            topic: topicName,
            partition: offset.partition,
            offset: offset.offset,
            high: offset.high,
            low: offset.low,
        }));
    }

    public async getConsumerGroupLag(groupId: string): Promise<Array<{
        topic: string;
        partition: number;
        currentOffset: string;
        highWatermark: string;
        lag: number;
    }>> {
        if (!this.isConnected) {
            throw new Error('Monitor não está conectado');
        }

        try {
            const groupOffsets = await this.admin.fetchOffsets({ groupId });
            const lagInfo: Array<{
                topic: string;
                partition: number;
                currentOffset: string;
                highWatermark: string;
                lag: number;
            }> = [];

            for (const topicOffset of groupOffsets) {
                const topicOffsets = await this.admin.fetchTopicOffsets(topicOffset.topic);

                for (const partitionOffset of topicOffset.partitions) {
                    const highWatermark = topicOffsets.find(
                        to => to.partition === partitionOffset.partition
                    )?.high || '0';

                    const lag = parseInt(highWatermark) - parseInt(partitionOffset.offset);

                    lagInfo.push({
                        topic: topicOffset.topic,
                        partition: partitionOffset.partition,
                        currentOffset: partitionOffset.offset,
                        highWatermark,
                        lag: Math.max(0, lag),
                    });

                    // Update Prometheus metrics
                    this.metrics.updateConsumerLag(
                        topicOffset.topic,
                        groupId,
                        partitionOffset.partition,
                        Math.max(0, lag)
                    );
                }
            }

            return lagInfo;
        } catch (error) {
            console.error(`❌ Erro ao obter lag do grupo ${groupId}:`, error);
            return [];
        }
    }

    public async createTopic(topicName: string, numPartitions = 3, replicationFactor = 1): Promise<void> {
        if (!this.isConnected) {
            throw new Error('Monitor não está conectado');
        }

        try {
            await this.admin.createTopics({
                topics: [{
                    topic: topicName,
                    numPartitions,
                    replicationFactor,
                }],
            });
            console.log(`✅ Tópico '${topicName}' criado com sucesso`);
        } catch (error) {
            console.error(`❌ Erro ao criar tópico '${topicName}':`, error);
            throw error;
        }
    }

    public async deleteTopic(topicName: string): Promise<void> {
        if (!this.isConnected) {
            throw new Error('Monitor não está conectado');
        }

        try {
            await this.admin.deleteTopics({
                topics: [topicName],
            });
            console.log(`✅ Tópico '${topicName}' deletado com sucesso`);
        } catch (error) {
            console.error(`❌ Erro ao deletar tópico '${topicName}':`, error);
            throw error;
        }
    }

    public async startMonitoring(intervalMs = 30000): Promise<void> {
        console.log(`📊 Iniciando monitoramento (intervalo: ${intervalMs / 1000}s)...`);

        this.monitoringInterval = setInterval(async () => {
            try {
                // Monitor consumer groups lag
                const groups = await this.getConsumerGroups();
                for (const group of groups) {
                    await this.getConsumerGroupLag(group.groupId);
                }
            } catch (error) {
                console.error('❌ Erro durante monitoramento:', error);
            }
        }, intervalMs);
    }

    public async stopMonitoring(): Promise<void> {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
            console.log('📊 Monitoramento parado');
        }
    }

    public async printClusterInfo(): Promise<void> {
        console.log('\n=== INFORMAÇÕES DO CLUSTER KAFKA ===');

        try {
            const brokers = await this.getBrokers();
            console.log('\n🖥️ Brokers:');
            brokers.forEach(broker => {
                console.log(`   Node ${broker.nodeId}: ${broker.host}:${broker.port}`);
            });

            const topics = await this.getTopics();
            console.log('\n📝 Tópicos:');
            topics.forEach(topic => {
                console.log(`   ${topic.name} (${topic.partitions.length} partições)`);
                topic.partitions.forEach(partition => {
                    console.log(`     Partição ${partition.partitionId}: Leader=${partition.leader}, Replicas=[${partition.replicas.join(',')}]`);
                });
            });

            const groups = await this.getConsumerGroups();
            console.log('\n👥 Consumer Groups:');
            groups.forEach(group => {
                console.log(`   ${group.groupId} (${group.state}) - ${group.members.length} membros`);
                group.members.forEach(member => {
                    console.log(`     ${member.clientId} (${member.clientHost})`);
                });
            });

        } catch (error) {
            console.error('❌ Erro ao obter informações do cluster:', error);
        }

        console.log('=====================================\n');
    }
}
