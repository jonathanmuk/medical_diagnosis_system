import React from 'react';
import { Link } from 'react-router-dom';
import { Container } from "../components/ui/container";
import { Button } from './ui/button';
import { Input } from './ui/input';

const Footer = () => {
  return (
    <footer>
      <div className="bg-slate-900 text-slate-200 py-12">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-4">
              <Link to="/" className="flex items-center space-x-2">
                <img
                  src="/images/logo.png"
                  alt="Dr.J Logo"
                  className="h-10 w-auto"
                />
                <span className="text-2xl font-bold text-white">Dr.J</span>
              </Link>
              <p className="text-slate-400">
                Uganda's premier digital healthcare ecosystem connecting patients with doctors, hospitals, 
                pharmacies, and wellness services.
              </p>
              <div className="flex space-x-4">
                <a href="https://facebook.com" className="text-slate-400 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                </a>
                <a href="https://twitter.com" className="text-slate-400 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                  </svg>
                </a>
                <a href="https://instagram.com" className="text-slate-400 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>
                <a href="https://linkedin.com" className="text-slate-400 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                    <rect x="2" y="9" width="4" height="12"></rect>
                    <circle cx="4" cy="4" r="2"></circle>
                  </svg>
                </a>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="text-slate-400 hover:text-white transition-colors">Home</Link>
                </li>
                <li>
                  <Link to="/about" className="text-slate-400 hover:text-white transition-colors">About Us</Link>
                </li>
                <li>
                  <Link to="/services" className="text-slate-400 hover:text-white transition-colors">Services</Link>
                </li>
                <li>
                  <Link to="/contact" className="text-slate-400 hover:text-white transition-colors">Contact</Link>
                </li>
                <li>
                  <Link to="/blog" className="text-slate-400 hover:text-white transition-colors">Blog</Link>
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Services</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/telemedicine" className="text-slate-400 hover:text-white transition-colors">Telemedicine</Link>
                </li>
                <li>
                  <Link to="/disease-prediction" className="text-slate-400 hover:text-white transition-colors">Disease Prediction</Link>
                </li>
                <li>
                  <Link to="/malaria-detection" className="text-slate-400 hover:text-white transition-colors">Malaria Detection</Link>
                </li>
                <li>
                  <Link to="/wellness" className="text-slate-400 hover:text-white transition-colors">Wellness Hub</Link>
                </li>
                <li>
                  <Link to="/insurance" className="text-slate-400 hover:text-white transition-colors">Health Insurance</Link>
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Subscribe to Our Newsletter</h3>
              <p className="text-slate-400">Stay updated with the latest health tips and features</p>
              <div className="flex space-x-2">
                <Input 
                  type="email" 
                  placeholder="Your email address" 
                  className="bg-slate-800 border-slate-700 text-white"
                />
                <Button type="submit">Subscribe</Button>
              </div>
              
              <div className="pt-4 space-y-2">
                <h3 className="text-lg font-medium text-white">Contact Us</h3>
                <p className="text-slate-400 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Kampala, Uganda
                </p>
                <p className="text-slate-400 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  +256 700 123 456
                </p>
                <p className="text-slate-400 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  info@drj.ug
                </p>
              </div>
            </div>
          </div>
        </Container>
      </div>
      
      <div className="bg-slate-950 py-4">
        <Container>
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} Dr.J. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/terms" className="text-slate-500 hover:text-slate-400 text-sm">
                Terms of Service
              </Link>
              <Link to="/privacy" className="text-slate-500 hover:text-slate-400 text-sm">
                Privacy Policy
              </Link>
              <Link to="/cookies" className="text-slate-500 hover:text-slate-400 text-sm">
                Cookie Policy
              </Link>
            </div>
          </div>
        </Container>
      </div>
    </footer>
  );
};

export default Footer;
