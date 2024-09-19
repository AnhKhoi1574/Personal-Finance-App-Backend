jest.setTimeout(30000); // 1 minute timeout
const mongoose = require('mongoose');
const request = require('supertest');
const server = require('./testServer');

let token = '';
let stolenId = '';
let stolenAmount = 20;
let stolenDelta = 10;
let maximumTransaction = 0;

async function clearTransactions() {
  let res = await request(server)
    .get('/api/transactions')
    .set('Authorization', `Bearer ${token}`);
  let transactions = [];
  res.body.data.transactions.forEach((transaction) => {
    transactions.push(transaction._id);
  });

  let successfulAttempts = 0;
  for (const transaction of transactions) {
    let res = await request(server)
      .delete(`/api/transactions/${transaction}`)
      .set('Authorization', `Bearer ${token}`);
    if (res.status === 200) {
      successfulAttempts++;
    }
  }
  if (successfulAttempts === transactions.length) {
    return true;
  }
  return false;
}

describe('Login and create test transaction', () => {
  it('should login', async () => {
    let res = await request(server)
      .post('/api/login')
      .send({ email: 'integrationtest@example.com', password: 'password' });

    // Delete user to start fresh
    let res2;
    if (res.status == 200) {
      res2 = await request(server)
        .delete('/api/profile')
        .set('Authorization', `Bearer ${res.body.token}`);
    }

    await request(server).post('/api/register').send({
      name: 'Integration Test User',
      email: 'integrationtest@example.com',
      password: 'password',
      birthday: '2000-01-01',
      currentBalance: 100000,
    });
    res = await request(server)
      .post('/api/login')
      .send({ email: 'integrationtest@example.com', password: 'password' });

    token = res.body.token;
    if (res2) {
      expect(res2.status).toBe(200);
    }
    expect(token).not.toEqual('');
    expect(res.status).toBe(200);
  });

  it('Add test record to transactions', async () => {
    let res = await request(server)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Lost money (got stolen)',
        category: 'Others',
        transactionAmount: stolenAmount,
        type: 'expense',
        date: '2024-07-01T08:45',
        isSavingsTransfer: false,
      });
    stolenId = res.body.data._id;
    // expect stolenid to not be an empty string
    expect(stolenId).not.toEqual('');
    expect(res.status).toBe(201);
  });
});

describe('Chatbot functionality', () => {
  it('/create command: add 20 transactions to the account', async () => {
    let numberOfTransactions = 20;
    const res = await request(server)
      .post('/api/gpt/generate')
      .set('Authorization', `Bearer ${token}`)

      //{"conversation_id":"66ea86730fa2795ce81e0f42","messages":[{"role":"user","content":"hello"}],"response_length":"short","temperature":0.5,"transaction_start_date":"","transaction_end_date":""}
      .send({
        conversation_id: '',
        messages: [
          {
            role: 'user',
            content:
              '/create From Jan 2024 to Sep 2024, each months should have atleast 1-3 entries of income/expenses. The value should be around 1-3000$. Make the data as realistic as possible. Generate ONLY ' +
              numberOfTransactions +
              'entries. (minimum-maximum)',
          },
        ],
        response_length: 'short',
        temperature: 0.5,
        transaction_start_date: '',
        transaction_end_date: '',
      });

    // Handle the streaming response
    let concatenatedContent = '';
    res.on('data', (chunk) => {
      const data = JSON.parse(chunk.toString());
      if (data.content && data.content.role === 'assistant') {
        concatenatedContent += data.content.content;
        if (concatenatedContent.includes('Done')) {
          res.destroy(); // Stop receiving more data
        }
      }
    });

    let res2 = await request(server)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${token}`);
    expect(res2.body.data.transactions.length).toEqual(
      numberOfTransactions + 1
    );
    expect(res.status).toBe(200);

    maximumTransaction = numberOfTransactions;
  });

  it('/update command: update test record', async () => {
    const res = await request(server)
      .post('/api/gpt/generate')
      .set('Authorization', `Bearer ${token}`)

      //{"conversation_id":"66ea86730fa2795ce81e0f42","messages":[{"role":"user","content":"hello"}],"response_length":"short","temperature":0.5,"transaction_start_date":"","transaction_end_date":""}
      .send({
        conversation_id: '',
        messages: [
          {
            role: 'user',
            content:
              '/update update my stolen record, I realized I was stolen ' +
              (stolenAmount + stolenDelta) +
              ' instead of ' +
              stolenAmount,
          },
        ],
        response_length: 'short',
        temperature: 0.5,
        transaction_start_date: '',
        transaction_end_date: '',
      });

    // Handle the streaming response
    let concatenatedContent = '';
    res.on('data', (chunk) => {
      const data = JSON.parse(chunk.toString());
      if (data.content && data.content.role === 'assistant') {
        concatenatedContent += data.content.content;
        if (concatenatedContent.includes('Done')) {
          res.destroy(); // Stop receiving more data
        }
      }
    });

    let res2 = await request(server)
      .get('/api/transactions/' + stolenId)
      .set('Authorization', `Bearer ${token}`);
    // expect(res.status).toBe(200);
    expect(res2.body.data.transaction.transactionAmount).toEqual(
      stolenAmount + stolenDelta
    );
  });

  it('/delete command: delete test record', async () => {
    const res = await request(server)
      .post('/api/gpt/generate')
      .set('Authorization', `Bearer ${token}`)

      //{"conversation_id":"66ea86730fa2795ce81e0f42","messages":[{"role":"user","content":"hello"}],"response_length":"short","temperature":0.5,"transaction_start_date":"","transaction_end_date":""}
      .send({
        conversation_id: '',
        messages: [
          {
            role: 'user',
            content: '/delete please delete my stolen money record',
          },
        ],
        response_length: 'short',
        temperature: 0.5,
        transaction_start_date: '',
        transaction_end_date: '',
      });

    // Handle the streaming response
    let concatenatedContent = '';
    res.on('data', (chunk) => {
      const data = JSON.parse(chunk.toString());
      if (data.content && data.content.role === 'assistant') {
        concatenatedContent += data.content.content;
        if (concatenatedContent.includes('Done')) {
          res.destroy(); // Stop receiving more data
        }
      }
    });

    let res2 = await request(server)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${token}`);
    expect(res2.body.data.transactions.length).toEqual(maximumTransaction);
  });
});


// Close the server after tests
afterAll(async () => {
  await mongoose.connection.close();
  server.close();
});