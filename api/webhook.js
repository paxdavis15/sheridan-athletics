const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  let rawBody = '';

  await new Promise((resolve, reject) => {
    req.on('data', chunk => { rawBody += chunk; });
    req.on('end', resolve);
    req.on('error', reject);
  });

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send('Webhook Error: ' + err.message);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const shipping = session.shipping_details?.address || {};
    const name = session.shipping_details?.name || session.customer_details?.name;

    const { error } = await supabase.from('orders').insert({
      stripe_session_id: session.id,
      customer_name: name,
      customer_email: session.customer_details?.email,
      shipping_address: shipping,
      line_items: lineItems.data,
      amount_total: session.amount_total,
      status: 'paid',
    });

    if (error) {
      console.error('Supabase insert error:', error.message);
      return res.status(500).json({ error: 'Failed to save order' });
    }

    console.log('Order saved for ' + name);
  }

  res.status(200).json({ received: true });
};
