import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { readFileSync } from 'node:fs';
import { env } from './config/env.js';
import { db } from './lib/db.js';
import { sameOrigin } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import authRoutes from './routes/auth.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import orderRoutes from './routes/order.routes.js';
import adminRoutes from './routes/admin.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import kitchenRoutes from './routes/kitchen.routes.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());
app.use(sameOrigin);
app.use('/api/auth', rateLimit({ windowMs: 15 * 60000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }), authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/orders', rateLimit({ windowMs: 60000, limit: 120, skip: req => req.method === 'GET', standardHeaders: 'draft-7', legacyHeaders: false }), orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', rateLimit({ windowMs: 60000, limit: 30, skip: req => req.method === 'GET', standardHeaders: 'draft-7', legacyHeaders: false }), paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'persian-food-api' }));
const spec = YAML.parse(readFileSync(new URL('../openapi.yaml', import.meta.url), 'utf8'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: 'Persian Food API' }));
app.use(notFound);
app.use(errorHandler);

export default app;

if (!process.env.VERCEL) {
    const port = Number(process.env.PORT || env.API_PORT);

    const server = app.listen(port, '0.0.0.0', () => {
        console.log(`Persian Food API listening on port ${port}`);
    });

    for (const signal of ['SIGINT', 'SIGTERM']) {
        process.once(signal, () => {
            server.close(() => {
                db.$disconnect().finally(() => process.exit(0));
            });
        });
    }
}

for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => db.$disconnect().finally(() => process.exit(0))));
