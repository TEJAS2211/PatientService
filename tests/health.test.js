const request = require('supertest');
const app = require('../src/index');

describe('Health Endpoint', () => {
  it('should return 200 and status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
