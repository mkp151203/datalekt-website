// Cities with partner hotels, in the order the growth map links them.
// labelSide: which side of the pin its label sits, so neighbours don't collide.

export interface City {
  key: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  labelSide: 'left' | 'right';
}

export const cities: City[] = [
  { key: 'mumbai', name: 'Mumbai', state: 'Maharashtra', lat: 19.076, lon: 72.8777, labelSide: 'left' },
  { key: 'pune', name: 'Pune', state: 'Maharashtra', lat: 18.5204, lon: 73.8567, labelSide: 'right' },
  { key: 'goa', name: 'Goa', state: 'Goa', lat: 15.4909, lon: 73.8278, labelSide: 'left' },
  { key: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lon: 77.5946, labelSide: 'left' },
  { key: 'chennai', name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lon: 80.2707, labelSide: 'right' },
  { key: 'kolkata', name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lon: 88.3639, labelSide: 'right' },
];
