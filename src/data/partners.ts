// Partner hotels: the one list behind the partners showcase, the growth map
// and its counts. To add a hotel, put its photo in src/assets/images/partners/
// and add an entry here (location is a key from cities.ts, or null when the
// hotel has no single city).
import type { ImageMetadata } from 'astro';
import { cities, type City } from './cities';

import stRegisMumbai from '../assets/images/partners/st-regis-mumbai.jpg';
import ritzCarltonPune from '../assets/images/partners/ritz-carlton-pune.jpg';
import jwMarriottPune from '../assets/images/partners/jw-marriott-pune.jpg';
import leelaBhartiyaCity from '../assets/images/partners/leela-bhartiya-city-bengaluru.jpg';
import conradPune from '../assets/images/partners/conrad-pune.jpg';
import sheratonGrandChennai from '../assets/images/partners/sheraton-grand-chennai.jpg';
import ritzCarltonBangalore from '../assets/images/partners/ritz-carlton-bangalore.jpg';
import marriottResortGoa from '../assets/images/partners/marriott-resort-goa.jpg';
import jwMarriottKolkata from '../assets/images/partners/jw-marriott-kolkata.jpg';
import hyattCentricHebbal from '../assets/images/partners/hyatt-centric-hebbal-bengaluru.jpg';
import pullman from '../assets/images/partners/pullman.jpg';

export interface Partner {
  name: string;
  /** Shown under the name in the showcase */
  cityLabel: string;
  /** Key from cities.ts, or null when the hotel has no single city */
  location: string | null;
  image: ImageMetadata;
}

const partners: Partner[] = [
  { name: 'St. Regis', cityLabel: 'Mumbai', location: 'mumbai', image: stRegisMumbai },
  { name: 'The Ritz-Carlton', cityLabel: 'Pune', location: 'pune', image: ritzCarltonPune },
  { name: 'JW Marriott', cityLabel: 'Pune', location: 'pune', image: jwMarriottPune },
  { name: 'The Leela Bhartiya City', cityLabel: 'Bengaluru', location: 'bengaluru', image: leelaBhartiyaCity },
  { name: 'Conrad', cityLabel: 'Pune', location: 'pune', image: conradPune },
  { name: 'Sheraton Grand', cityLabel: 'Chennai', location: 'chennai', image: sheratonGrandChennai },
  { name: 'The Ritz-Carlton', cityLabel: 'Bangalore', location: 'bengaluru', image: ritzCarltonBangalore },
  { name: 'Marriott Resort', cityLabel: 'Goa', location: 'goa', image: marriottResortGoa },
  { name: 'JW Marriott', cityLabel: 'Kolkata', location: 'kolkata', image: jwMarriottKolkata },
  { name: 'Hyatt Centric Hebbal', cityLabel: 'Bengaluru', location: 'bengaluru', image: hyattCentricHebbal },
  { name: 'Pullman', cityLabel: 'Hotels and Resorts', location: null, image: pullman },
];

export function getPartners(): Partner[] {
  return partners;
}

export interface CityWithHotels extends City {
  hotels: string[];
}

/** Cities that have partner hotels, in map order, each with its hotel names */
export function getPartnerCities(): CityWithHotels[] {
  return cities
    .map((city) => ({
      ...city,
      hotels: partners.filter((p) => p.location === city.key).map((p) => p.name),
    }))
    .filter((city) => city.hotels.length > 0);
}

export function getPartnerStats() {
  const partnerCities = getPartnerCities();
  return {
    hotels: partners.length,
    cities: partnerCities.length,
    states: new Set(partnerCities.map((c) => c.state)).size,
  };
}
