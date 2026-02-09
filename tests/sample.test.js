const request = require('supertest');
const app = require('../src/index');

describe('Sample API Test', () => {
  it('should return 200 for health endpoint', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
  });
});
