export default async function handler(req, res) {
  const target = 'https://raxson.freepage.cc/api/' + req.query.path;
  
  try {
    const response = await fetch(target, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });
    
    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
