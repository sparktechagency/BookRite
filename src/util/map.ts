import axios from 'axios';

export const geocodeAddress = async (address: string): Promise<[number, number]> => {
  try {
    const apiKey = process.env.GoogleMapApiKey;
    if (!apiKey) throw new Error('GoogleMapApiKey is not defined in .env');

    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

    const response = await axios.get(url);
    const result = response.data.results?.[0];

    if (!result || !result.geometry?.location) {
      throw new Error('Invalid response from Google Geocoding API');
    }

    const { lat, lng } = result.geometry.location;
    return [lng, lat]; // GeoJSON format: [longitude, latitude]
  } catch (error: any) {
    console.error('Geocoding error:', error?.message || error);
    throw new Error('Failed to geocode address');
  }
};
