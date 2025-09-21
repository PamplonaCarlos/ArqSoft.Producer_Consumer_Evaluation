#!/usr/bin/env node

const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'topic-creator',
    brokers: ['localhost:9092'],
});

const admin = kafka.admin();

const topics = [
    { topic: 'performance-test', numPartitions: 6, replicationFactor: 1 },
    { topic: 'stress-test', numPartitions: 12, replicationFactor: 1 },
    { topic: 'exhaustion-test', numPartitions: 3, replicationFactor: 1 },
    { topic: 'lag-test', numPartitions: 6, replicationFactor: 1 },
    { topic: 'custom-test', numPartitions: 3, replicationFactor: 1 },
];

async function createTopics() {
    console.log('🔧 Criando tópicos Kafka...');

    try {
        await admin.connect();

        // Check existing topics
        const existingTopics = await admin.listTopics();
        console.log('📝 Tópicos existentes:', existingTopics);

        // Filter out existing topics
        const newTopics = topics.filter(topic => !existingTopics.includes(topic.topic));

        if (newTopics.length === 0) {
            console.log('✅ Todos os tópicos já existem!');
            return;
        }

        // Create new topics
        await admin.createTopics({
            topics: newTopics,
            waitForLeaders: true,
        });

        console.log('✅ Tópicos criados com sucesso:');
        newTopics.forEach(topic => {
            console.log(`   - ${topic.topic} (${topic.numPartitions} partições)`);
        });

        // Verify topics were created
        const updatedTopics = await admin.listTopics();
        console.log('📝 Tópicos atuais:', updatedTopics);

    } catch (error) {
        console.error('❌ Erro ao criar tópicos:', error);
        process.exit(1);
    } finally {
        await admin.disconnect();
    }
}

if (require.main === module) {
    createTopics();
}
