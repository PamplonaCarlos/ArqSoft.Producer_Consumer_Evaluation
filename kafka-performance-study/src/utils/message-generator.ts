import { TestMessage } from './types';

export class MessageGenerator {
    private static generateRandomString(length: number): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    public static generateMessage(id: string, targetSize: number): TestMessage {
        const timestamp = Date.now();
        const baseMessage = {
            id,
            timestamp,
            payload: '',
            size: 0
        };

        // Calculate overhead of JSON serialization
        const baseSize = JSON.stringify(baseMessage).length;
        const payloadSize = Math.max(1, targetSize - baseSize);

        const payload = this.generateRandomString(payloadSize);
        const message: TestMessage = {
            id,
            timestamp,
            payload,
            size: targetSize
        };

        return message;
    }

    public static generateBatch(batchSize: number, messageSize: number, startId = 0): TestMessage[] {
        const messages: TestMessage[] = [];
        for (let i = 0; i < batchSize; i++) {
            const id = `msg-${startId + i}-${Date.now()}`;
            messages.push(this.generateMessage(id, messageSize));
        }
        return messages;
    }

    public static createRealisticMessage(type: 'user-event' | 'order' | 'log' | 'sensor-data', targetSize?: number): TestMessage {
        const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        let payload: any;

        switch (type) {
            case 'user-event':
                payload = {
                    userId: Math.floor(Math.random() * 100000),
                    eventType: ['click', 'view', 'purchase', 'login'][Math.floor(Math.random() * 4)],
                    page: `/page-${Math.floor(Math.random() * 100)}`,
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                    sessionId: `session-${Math.random().toString(36).substr(2, 16)}`
                };
                break;

            case 'order':
                payload = {
                    orderId: `order-${Math.random().toString(36).substr(2, 12)}`,
                    customerId: Math.floor(Math.random() * 50000),
                    items: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, i) => ({
                        productId: `prod-${Math.floor(Math.random() * 1000)}`,
                        quantity: Math.floor(Math.random() * 10) + 1,
                        price: Math.floor(Math.random() * 10000) / 100
                    })),
                    totalAmount: Math.floor(Math.random() * 100000) / 100,
                    status: ['pending', 'confirmed', 'shipped', 'delivered'][Math.floor(Math.random() * 4)]
                };
                break;

            case 'log':
                payload = {
                    level: ['DEBUG', 'INFO', 'WARN', 'ERROR'][Math.floor(Math.random() * 4)],
                    service: `service-${Math.floor(Math.random() * 10)}`,
                    message: `Log message ${Math.random().toString(36).substr(2, 20)}`,
                    thread: `thread-${Math.floor(Math.random() * 100)}`,
                    logger: `com.example.service.Class${Math.floor(Math.random() * 100)}`
                };
                break;

            case 'sensor-data':
                payload = {
                    sensorId: `sensor-${Math.floor(Math.random() * 1000)}`,
                    temperature: Math.floor(Math.random() * 100 - 20),
                    humidity: Math.floor(Math.random() * 100),
                    pressure: Math.floor(Math.random() * 2000 + 900),
                    location: {
                        lat: Math.random() * 180 - 90,
                        lng: Math.random() * 360 - 180
                    }
                };
                break;
        }

        const baseMessage: TestMessage = {
            id,
            timestamp: Date.now(),
            payload: JSON.stringify(payload),
            size: 0
        };

        if (targetSize) {
            const currentSize = JSON.stringify(baseMessage).length;
            if (currentSize < targetSize) {
                const padding = this.generateRandomString(targetSize - currentSize);
                payload.padding = padding;
                baseMessage.payload = JSON.stringify(payload);
            }
        }

        baseMessage.size = JSON.stringify(baseMessage).length;
        return baseMessage;
    }
}
