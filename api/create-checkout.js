const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Product catalog — price IDs set as Vercel env vars
const PRODUCTS = {
  training_tee: {
    name: 'The Training Tee',
    priceId: process.env.PRICE_TRAINING_TEE,
  },
  stride_shorts: {
    name: 'Stride 5" Shorts',
    priceId: process.env.PRICE_STRIDE_SHORTS,
  },
  track_jacket: {
    name: 'The Track Jacket',
    priceId: process.env.PRICE_TRACK_JACKET,
  },
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://paxdavis15.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { productId } = req.body;
  const product = PRODUCTS[productId];

  if (!product || !product.priceId) {
    return res.status(400).json({ error: 'Invalid product' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: product.priceId, quantity: 1 }],
      mode: 'payment',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'AU', 'GB', 'NZ'],
      },
      success_url: 'https://paxdavis15.github.io/sheridan-athletics/?order=success',
      cancel_url: 'https://paxdavis15.github.io/sheridan-athletics/?order=cancelled',
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: 'Could not create checkout session' });
  }
};
