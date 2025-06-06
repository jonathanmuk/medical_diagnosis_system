import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import '../styles/homepage.css';

// Shadcn components
import { Button } from "../components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../components/ui/carousel";
import { Container } from "../components/ui/container";
import { Input } from "../components/ui/input";

const HomePage = () => {
  const { isAuthenticated, userProfile } = useAuth();
  const carouselRef = useRef(null);
  const indicatorRefs = useRef([]);

  useEffect(() => {
    // Auto-slide functionality
    const interval = setInterval(() => {
      if (carouselRef.current) {
        const nextButton = carouselRef.current.querySelector('[data-carousel-next]');
        if (nextButton) {
          nextButton.click();
        }
      }
    }, 5000);

    // Indicator sync functionality
    const updateIndicators = () => {
      const activeSlide = document.querySelector('.carousel-item.active');
      if (activeSlide) {
        const slideIndex = Array.from(activeSlide.parentNode.children).indexOf(activeSlide);
        indicatorRefs.current.forEach((indicator, index) => {
          if (indicator) {
            indicator.classList.toggle('active', index === slideIndex);
          }
        });
      }
    };

    // Observer for slide changes
    const observer = new MutationObserver(updateIndicators);
    const carouselContent = document.querySelector('.carousel-content');
    if (carouselContent) {
      observer.observe(carouselContent, { childList: true, subtree: true });
    }

    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <Carousel className="w-full hero-carousel" opts={{ loop: true, autoplay: { delay: 5000 }, align: "start" }}>
          <CarouselContent>
            {/* Hero Slide 1 */}
            <CarouselItem>
              <div className="relative h-[100vh] w-full hero-slide">
                <div className="hero-background">
                  <img
                    src="/images/hero-1.jpg"
                    alt="Medical professionals"
                    className="w-full h-full object-cover"
                  />
                  <div className="hero-overlay"></div>
                </div>
                
                {/* Animated background elements */}
                <div className="hero-particles">
                  <div className="particle particle-1"></div>
                  <div className="particle particle-2"></div>
                  <div className="particle particle-3"></div>
                  <div className="particle particle-4"></div>
                </div>
                
                <div className="absolute inset-0 flex items-center z-10">
                  <Container>
                    <div className="max-w-2xl space-y-8 hero-content">
                      <div className="hero-badge-wrapper">
                        <Badge variant="primary" className="hero-badge">
                          <span className="badge-icon">🇺🇬</span>
                          Uganda's Premier Health Platform
                        </Badge>
                      </div>
                      
                      <div className="hero-title-wrapper">
                        <h1 className="hero-title">
                          <span className="title-main">Dr.J</span>
                          <span className="title-pulse"></span>
                        </h1>
                        <h2 className="hero-subtitle">
                          Your All-in-One Digital Healthcare Ecosystem
                        </h2>
                      </div>
                      
                      <p className="hero-description">
                        Connecting patients with doctors, hospitals, pharmacies, and wellness services 
                        through cutting-edge AI technology and seamless digital experiences.
                      </p>
                      
                      <div className="hero-cta-wrapper">
                        {isAuthenticated ? (
                          <Button asChild size="lg" className="hero-cta-primary">
                            <Link to="/dashboard">
                              <span>Go to Dashboard</span>
                              <svg className="cta-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                            </Link>
                          </Button>
                        ) : (
                          <>
                            <Button asChild size="lg" className="hero-cta-primary">
                              <Link to="/login">
                                <span>Get Started</span>
                                <svg className="cta-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                              </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="hero-cta-secondary">
                              <Link to="/register">
                                <span>Learn More</span>
                              </Link>
                            </Button>
                          </>
                        )}
                      </div>
                      
                      {/* Trust indicators */}
                      <div className="hero-trust-indicators">
                        <div className="trust-item">
                          <span className="trust-number">50K+</span>
                          <span className="trust-label">Patients Served</span>
                        </div>
                        <div className="trust-item">
                          <span className="trust-number">500+</span>
                          <span className="trust-label">Healthcare Providers</span>
                        </div>
                        <div className="trust-item">
                          <span className="trust-number">99.9%</span>
                          <span className="trust-label">Uptime</span>
                        </div>
                      </div>
                    </div>
                  </Container>
                </div>
              </div>
            </CarouselItem>

            {/* Hero Slide 2 */}
            <CarouselItem>
              <div className="relative h-[100vh] w-full hero-slide">
                <div className="hero-background">
                  <img
                    src="/images/hero-2.jpg"
                    alt="Telemedicine"
                    className="w-full h-full object-cover"
                  />
                  <div className="hero-overlay hero-overlay-blue"></div>
                </div>
                
                <div className="hero-particles">
                  <div className="particle particle-1"></div>
                  <div className="particle particle-2"></div>
                  <div className="particle particle-3"></div>
                </div>
                
                <div className="absolute inset-0 flex items-center z-10">
                  <Container>
                    <div className="max-w-2xl space-y-8 hero-content">
                      <div className="hero-badge-wrapper">
                        <Badge variant="primary" className="hero-badge hero-badge-blue">
                          <span className="badge-icon">📱</span>
                          Telemedicine
                        </Badge>
                      </div>
                      
                      <div className="hero-title-wrapper">
                        <h1 className="hero-title hero-title-alt">
                          Virtual Care, Real Results
                        </h1>
                      </div>
                      
                      <p className="hero-description">
                        Access quality healthcare from anywhere through virtual consultations, 
                        AI-powered diagnostics, and 24/7 medical support.
                      </p>
                      
                      <div className="hero-cta-wrapper">
                        <Button asChild size="lg" className="hero-cta-primary">
                          <Link to={isAuthenticated ? "/dashboard" : "/register"}>
                            <span>{isAuthenticated ? "Access Services" : "Join Now"}</span>
                            <svg className="cta-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </Container>
                </div>
              </div>
            </CarouselItem>

            {/* Hero Slide 3 */}
            <CarouselItem>
              <div className="relative h-[100vh] w-full hero-slide">
                <div className="hero-background">
                  <img
                    src="/images/hero-3.jpg"
                    alt="AI Healthcare"
                    className="w-full h-full object-cover"
                  />
                  <div className="hero-overlay hero-overlay-purple"></div>
                </div>
                
                <div className="hero-particles">
                  <div className="particle particle-1"></div>
                  <div className="particle particle-2"></div>
                  <div className="particle particle-3"></div>
                </div>
                
                <div className="absolute inset-0 flex items-center z-10">
                  <Container>
                    <div className="max-w-2xl space-y-8 hero-content">
                      <div className="hero-badge-wrapper">
                        <Badge variant="primary" className="hero-badge hero-badge-purple">
                          <span className="badge-icon">🤖</span>
                          AI-Powered
                        </Badge>
                      </div>
                      
                      <div className="hero-title-wrapper">
                        <h1 className="hero-title hero-title-alt">
                          Smart Diagnostics
                        </h1>
                      </div>
                      
                      <p className="hero-description">
                        Advanced AI technology for accurate disease prediction, early detection, 
                        and transparent medical reasoning you can trust.
                      </p>
                      
                      <div className="hero-cta-wrapper">
                        <Button asChild size="lg" className="hero-cta-primary">
                          <Link to={isAuthenticated ? "/disease-prediction" : "/register"}>
                            <span>Try AI Diagnosis</span>
                            <svg className="cta-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </Container>
                </div>
              </div>
            </CarouselItem>
          </CarouselContent>
          
          {/* Slide indicators */}
           <div className="hero-indicators">
            <div className="indicator" data-slide="0"></div>
            <div className="indicator" data-slide="1"></div>
            <div className="indicator" data-slide="2"></div>
          </div>
        </Carousel>

        {/* Modern Stats Cards */}
        <Container>
          <div className="stats-container">
            <div className="stats-card">
              <div className="stats-icon stats-icon-green">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="stats-content">
                <h3 className="stats-number">100+</h3>
                <p className="stats-label">Partner Hospitals</p>
              </div>
              <div className="stats-trend">
                <span className="trend-up">↗ 8%</span>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-icon stats-icon-purple">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div className="stats-content">
                <h3 className="stats-number">250+</h3>
                <p className="stats-label">Pharmacies</p>
              </div>
              <div className="stats-trend">
                <span className="trend-up">↗ 15%</span>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-icon stats-icon-orange">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="stats-content">
                <h3 className="stats-number">50K+</h3>
                <p className="stats-label">Patients Served</p>
              </div>
              <div className="stats-trend">
                <span className="trend-up">↗ 25%</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* About Section */}
      <section className="py-20">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <img
                src="/images/about-mission.jpg"
                alt="Our Mission"
                className="rounded-lg shadow-xl w-full h-[400px] object-cover"
              />
            </div>
            <div className="space-y-6">
              <div>
                <Badge className="mb-2">Our Mission</Badge>
                <h2 className="text-4xl font-bold mb-4">Democratizing Access to Quality Healthcare</h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Dr.J bridges gaps in affordability, access, and preventative care in Uganda through telemedicine, 
                  real-time data, and financial inclusivity.
                </p>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-medium mb-1">Affordable Care</h3>
                  <p className="text-muted-foreground">Promoting healthcare access through insurance integration and mobile money payments</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-medium mb-1">Digital Innovation</h3>
                  <p className="text-muted-foreground">Leveraging technology to provide virtual consultations and real-time health monitoring</p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-slate-50">
        <Container>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-2">Our Services</Badge>
            <h2 className="text-4xl font-bold mb-4">Comprehensive Healthcare Solutions</h2>
            <p className="text-lg text-muted-foreground">
              Dr.J offers a wide range of services designed to meet all your healthcare needs in one platform
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="transition-all hover:shadow-lg">
              <CardHeader>
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <CardTitle>Telemedicine</CardTitle>
                <CardDescription>
                  Virtual consultations for acute conditions, chronic care, and mental health support
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    24/7 urgent care access
                  </li>
                  <li className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    E-prescriptions
                  </li>
                  <li className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Follow-up appointments
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link to={isAuthenticated ? "/dashboard" : "/login"}>
                    Access Telemedicine
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 13.5l3.75 3.75m0-7.5L9.75 13.5m11.25-9l-3.75 3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                </div>
                <CardTitle>AI Diagnostics</CardTitle>
                <CardDescription>
                  Advanced diagnostic tools powered by artificial intelligence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Malaria detection
                  </li>
                  <li className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Disease prediction
                  </li>
                  <li className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Symptom checker
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link to={isAuthenticated ? "/disease-prediction" : "/login"}>
                    Try AI Diagnosis
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <CardTitle>Wellness Hub</CardTitle>
                <CardDescription>
                  Comprehensive wellness services for holistic health management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Nutrition guidance
                  </li>
                  <li className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Mental health support
                  </li>
                  <li className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Fitness recommendations
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link to={isAuthenticated ? "/wellness" : "/login"}>
                    Explore Wellness
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </Container>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <Container>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-2">Key Features</Badge>
            <h2 className="text-4xl font-bold mb-4">Why Choose Dr.J?</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Mobile Accessibility</h3>
              <p className="text-muted-foreground">Access healthcare services anytime, anywhere through our mobile platform</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Secure & Private</h3>
              <p className="text-muted-foreground">Your health data is protected with enterprise-grade security and encryption</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Flexible Payments</h3>
              <p className="text-muted-foreground">Mobile money integration and insurance options to reduce out-of-pocket expenses</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Digital Health Records</h3>
              <p className="text-muted-foreground">Access your complete medical history and share with healthcare providers as needed</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Instant Assistance</h3>
              <p className="text-muted-foreground">Get immediate medical guidance through our AI-powered symptom checker</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Community Support</h3>
              <p className="text-muted-foreground">Connect with others facing similar health challenges through moderated support groups</p>
            </div>
          </div>
        </Container>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-muted/50">
        <Container>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-2">Testimonials</Badge>
            <h2 className="text-4xl font-bold mb-4">What Our Users Say</h2>
            <p className="text-muted-foreground">
              Hear from people who have transformed their healthcare experience with Dr.J
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <div className="mr-4">
                    <Avatar>
                      <AvatarImage src="https://randomuser.me/api/portraits/women/32.jpg" />
                      <AvatarFallback>SN</AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <p className="font-medium">Sarah Njeri</p>
                    <p className="text-sm text-muted-foreground">Nairobi, Kenya</p>
                  </div>
                </div>
                <div className="flex mb-2">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-muted-foreground">
                  "Dr.J has been a lifesaver for my family. Living in a rural area, we used to travel hours for medical consultations. Now, we get expert advice from the comfort of our home."
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <div className="mr-4">
                    <Avatar>
                      <AvatarImage src="https://randomuser.me/api/portraits/men/42.jpg" />
                      <AvatarFallback>KO</AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <p className="font-medium">Kwame Osei</p>
                    <p className="text-sm text-muted-foreground">Accra, Ghana</p>
                  </div>
                </div>
                <div className="flex mb-2">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-muted-foreground">
                  "The AI malaria detection feature detected my daughter's infection early, allowing us to get treatment before it became severe. This technology is revolutionary for our community."
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <div className="mr-4">
                    <Avatar>
                      <AvatarImage src="https://randomuser.me/api/portraits/women/68.jpg" />
                      <AvatarFallback>AA</AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <p className="font-medium">Amina Abdi</p>
                    <p className="text-sm text-muted-foreground">Mogadishu, Somalia</p>
                  </div>
                </div>
                <div className="flex mb-2">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-muted-foreground">
                  "As someone managing a chronic condition, Dr.J has made it so much easier to track my symptoms, medications, and appointments. The reminders feature ensures I never miss taking my medicine."
                </p>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <Container>
          <div className="bg-primary text-primary-foreground p-8 md:p-12 rounded-xl">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to transform your healthcare experience?</h2>
              <p className="text-primary-foreground/90 mb-8 text-lg">
                Join thousands of users across Africa who are taking control of their health with Dr.J's innovative digital health platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90">
                  <Link to="/register">Get Started for Free</Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="border-white text-white hover:bg-white/10">
                  <Link to="/about">Learn More</Link>
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>
      <Footer/>
    </div>
  );
};

export default HomePage;


