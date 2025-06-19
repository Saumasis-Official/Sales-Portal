import responseTemplate from '../helper/responseTemplate';
module.exports = {
  validatePayload(req, res, next) {
    try {
      // validatr token here is its valid here
      const token = req.body;
      if ((req.method === 'POST' || req.method === 'PUT') && req.body !== null) {
        next();
      }
      res.status(403).json(responseTemplate.error('Technical Error', 'payload is required for HTTP Post & Put'));
    } catch (error) {
      res.status(403).json(responseTemplate.error('Technical Error', 'There may some error occurred in user validation'));
    }

  }
};
