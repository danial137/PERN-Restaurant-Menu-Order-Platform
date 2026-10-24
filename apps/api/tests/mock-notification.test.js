import test from 'node:test';
import assert from 'node:assert/strict';
import { mockSmsAdapter, mockTelegramAdapter } from '../src/adapters/mock-notification.adapter.js';
test('mock SMS never calls an external service',async()=>assert.match((await mockSmsAdapter.send({phone:'+989121234567',message:'Hello'})).preview,/MOCK SMS/));
test('mock SMS requires valid demo phone',async()=>assert.rejects(mockSmsAdapter.send({phone:'123',message:'Hello'}),/valid demo phone/));
test('mock Telegram renders preview',async()=>assert.match((await mockTelegramAdapter.send({chatId:'demo:1',message:'Hello'})).preview,/MOCK TELEGRAM/));
test('mock Telegram refuses unlinked chats',async()=>assert.rejects(mockTelegramAdapter.send({chatId:'',message:'Hello'}),/not linked/));
