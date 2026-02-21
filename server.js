const express = require('express');
const app = express();

const IOS_URL = 'https://apps.apple.com/br/app/papelaria-unic%C3%B3rnio/id1629883720';
const ANDROID_URL = 'https://play.google.com/store/apps/details?id=com.converta.papunicornio';
const FALLBACK_URL = 'https://www.papelariaunicornio.com.br/app';

app.get('*', (req, res) => {
  const ua = req.headers['user-agent'] || '';

  if (/iPhone|iPad|iPod/i.test(ua)) {
    return res.redirect(301, IOS_URL);
  }

  if (/Android/i.test(ua)) {
    return res.redirect(301, ANDROID_URL);
  }

  return res.redirect(301, FALLBACK_URL);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
