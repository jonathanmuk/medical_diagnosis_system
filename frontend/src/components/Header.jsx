import React, { useState } from 'react';
import '../styles/components/Header.css';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from "./ui/button";
import { Container } from "../components/ui/container";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./ui/navigation-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { 
  Menu, 
  Stethoscope, 
  Brain, 
  Activity, 
  User, 
  Settings, 
  LogOut,
  ChevronDown,
  Shield
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "./ui/sheet";
import { cn } from "../lib/utils";

const Header = () => {
  const { isAuthenticated, userProfile, logout } = useAuth();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path) => location.pathname === path;

  const navigationItems = [
    { path: '/', label: 'Home', icon: null },
    { path: '/about', label: 'About', icon: null },
    { path: '/services', label: 'Services', icon: null },
    { path: '/contact', label: 'Contact', icon: null },
  ];

  const authenticatedItems = [
    { 
      path: '/disease-prediction', 
      label: 'Disease Prediction', 
      icon: <Stethoscope className="w-4 h-4" />,
      badge: 'Basic'
    },
    { 
      path: '/enhanced-disease-prediction', 
      label: 'Enhanced Prediction', 
      icon: <Brain className="w-4 h-4" />,
      badge: 'AI'
    },
    { 
      path: '/malaria-detection', 
      label: 'Malaria Detection', 
      icon: <Activity className="w-4 h-4" />,
      badge: 'Lab'
    },
  ];

  const userMenuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <Activity className="w-4 h-4" /> },
    { path: '/profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
    { path: '/diagnostic-history', label: 'Health Records', icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <header className={cn(
      "header-container",
      isScrolled && "header-scrolled"
    )}>
      <Container>
        <div className="header-content">
          {/* Logo Section */}
          <div className="logo-section">
            <Link to="/" className="logo-link">
              <div className="logo-wrapper">
                <img
                  src="/images/logo.png"
                  alt="Dr.J Logo"
                  className="logo-image"
                />
                <div className="logo-text">
                  <span className="logo-title">Dr.J</span>
                  <span className="logo-subtitle">AI Health Assistant</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <NavigationMenu className="desktop-nav">
            <NavigationMenuList>
              {/* Basic Navigation */}
              {navigationItems.map((item) => (
                <NavigationMenuItem key={item.path}>
                  <Link to={item.path} legacyBehavior passHref>
                    <NavigationMenuLink className={cn(
                      "nav-link",
                      isActive(item.path) && "nav-link-active"
                    )}>
                      {item.label}
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              ))}

              {/* AI Tools Dropdown for Authenticated Users */}
              {isAuthenticated && (
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="nav-trigger">
                    <Brain className="w-4 h-4 mr-2" />
                    AI Tools
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="ai-tools-dropdown">
                      <div className="dropdown-header">
                        <h4>AI-Powered Diagnostics</h4>
                        <p>Advanced medical prediction tools</p>
                      </div>
                      <div className="dropdown-items">
                        {authenticatedItems.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                              "dropdown-item",
                              isActive(item.path) && "dropdown-item-active"
                            )}
                          >
                            <div className="dropdown-item-icon">
                              {item.icon}
                            </div>
                            <div className="dropdown-item-content">
                              <span className="dropdown-item-title">{item.label}</span>
                              {item.badge && (
                                <Badge variant="secondary" className="dropdown-item-badge">
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              )}
            </NavigationMenuList>
          </NavigationMenu>

          {/* Mobile Navigation */}
          <Sheet>
            <SheetTrigger asChild className="mobile-menu-trigger">
              <Button variant="ghost" size="icon" className="mobile-menu-button">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="mobile-sheet">
              <div className="mobile-nav-content">
                <div className="mobile-logo">
                  <img src="/images/logo.png" alt="Dr.J" className="mobile-logo-image" />
                  <span className="mobile-logo-text">Dr.J</span>
                </div>
                
                <div className="mobile-nav-items">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "mobile-nav-item",
                        isActive(item.path) && "mobile-nav-item-active"
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}

                  {isAuthenticated && (
                    <>
                      <div className="mobile-nav-divider">
                        <span>AI Tools</span>
                      </div>
                      {authenticatedItems.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={cn(
                            "mobile-nav-item mobile-nav-item-ai",
                            isActive(item.path) && "mobile-nav-item-active"
                          )}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="mobile-nav-badge">
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      ))}

                      <div className="mobile-nav-divider">
                        <span>Account</span>
                      </div>
                      {userMenuItems.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={cn(
                            "mobile-nav-item mobile-nav-item-account",
                            isActive(item.path) && "mobile-nav-item-active"
                          )}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </Link>
                      ))}

                      <button
                        onClick={logout}
                        className="mobile-logout-button"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </>
                  )}

                  {!isAuthenticated && (
                    <div className="mobile-auth-buttons">
                      <Button asChild variant="outline" className="mobile-auth-button">
                        <Link to="/login">Login</Link>
                      </Button>
                      <Button asChild className="mobile-auth-button mobile-auth-button-primary">
                        <Link to="/register">Get Started</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* User Actions */}
          <div className="user-actions">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="user-menu-trigger">
                    <Avatar className="user-avatar">
                      <AvatarImage src={userProfile?.avatar} alt={userProfile?.username || 'User'} />
                      <AvatarFallback className="user-avatar-fallback">
                        {userProfile?.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="user-info">
                      <span className="user-name">{userProfile?.username || 'User'}</span>
                      <span className="user-role">Patient</span>
                    </div>
                    <ChevronDown className="w-4 h-4 user-menu-chevron" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="user-dropdown" align="end" forceMount>
                  <DropdownMenuLabel className="user-dropdown-header">
                    <div className="user-dropdown-info">
                      <p className="user-dropdown-name">{userProfile?.username || 'User'}</p>
                      <p className="user-dropdown-email">{userProfile?.email || ''}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    {userMenuItems.map((item) => (
                      <DropdownMenuItem key={item.path} asChild>
                        <Link to={item.path} className="user-dropdown-item">
                          {item.icon}
                          <span>{item.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="user-dropdown-logout"
                    onClick={logout}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="auth-buttons">
                <Button asChild variant="ghost" className="auth-button auth-button-login">
                  <Link to="/login">Login</Link>
                </Button>
                <Button asChild className="auth-button auth-button-register">
                  <Link to="/register">Get Started</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </Container>
    </header>
  );
};

export default Header;
