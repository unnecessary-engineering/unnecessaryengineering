const express = require('express');
const app = express();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.use(express.json());
app.use(express.static('public'));

app.post('/create-checkout-session', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: req.body.priceId, quantity: 1 }],
    mode: 'payment',
    success_url: `${req.headers.origin}/success.html`,
    cancel_url: `${req.headers.origin}`
  });

  res.json({ id: session.id });
});

app.listen(3000, () => console.log('Server running on port 3000'));