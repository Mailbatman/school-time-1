import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { pincode } = req.query;

  if (!pincode || typeof pincode !== 'string' || !/^\d{6}$/.test(pincode)) {
    return res.status(400).json({ error: 'A valid 6-digit Indian pincode is required.' });
  }

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    if (!response.ok) {
      throw new Error('Failed to fetch pincode data.');
    }

    const data = await response.json();

    if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice.length > 0) {
      const { District, State } = data[0].PostOffice[0];
      return res.status(200).json({ city: District, state: State });
    } else {
      return res.status(404).json({ error: 'Pincode not found.' });
    }
  } catch (error) {
    console.error('Pincode API error:', error);
    return res.status(500).json({ error: 'An internal error occurred.' });
  }
}