
const validation: any = {
  validatePayload(req, res, next) {
    try {
      // validatr token here is its valid here
      // const token = req.body;
      if ((req.method === 'POST' || req.method === 'PUT') && req.body !== null) {
        next();
      } else {
        res.status(403).json({ success: false, message: 'Payload is required for HTTP Post & Put ' });
      }
    } catch (error) {
      res.status(403).json({ success: false, message: 'Technical Error' });
    }


  }
}
export default validation;
