import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db, wallets, transactions } from '@tcs-network/shared';
import { eq } from 'drizzle-orm';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'wallet' });
});

app.get('/api/wallet/:userId', async (req, res) => {
  try {
    const wallet = await db.select().from(wallets).where(eq(wallets.userId, req.params.userId)).limit(1);
    if (wallet.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    res.json(wallet[0]);
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

app.get('/api/transactions/:userId', async (req, res) => {
  try {
    const userTransactions = await db.select().from(transactions).where(eq(transactions.userId, req.params.userId));
    res.json(userTransactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.listen(PORT, () => {
  console.log(`Wallet API running on port ${PORT}`);
});
