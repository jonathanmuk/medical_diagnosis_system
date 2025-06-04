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
  navigationMenuTriggerStyle,
} from "./ui/navigation-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "./ui/sheet";
import { cn } from "../lib/utils";

const Header = () => {
  const { isAuthenticated, userProfile, logout } = useAuth();
  const location = useLocation();
  
  // Function to determine if a nav link is active
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <Container>
        <div className="flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/images/logo.png"
                alt="Dr.J Logo"
                className="h-10 w-auto"
              />
              <span className="font-semibold text-black text-xl hidden sm:inline-block font-serif">Dr.J</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link to="/" legacyBehavior passHref>
                  <NavigationMenuLink className={cn(
                    "text-black no-underline px-4 py-2 hover:text-primary transition-colors duration-200",
                    isActive('/') && "font-bold text-primary"
                  )}>
                    Home
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/about" legacyBehavior passHref>
                  <NavigationMenuLink className={cn(
                    "text-black no-underline px-4 py-2 hover:text-primary transition-colors duration-200",
                    isActive('/about') && "font-bold text-primary"
                  )}>
                    About
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/services" legacyBehavior passHref>
                  <NavigationMenuLink className={cn(
                    "text-black no-underline px-4 py-2 hover:text-primary transition-colors duration-200",
                    isActive('/services') && "font-bold text-primary"
                  )}>
                    Services
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/contact" legacyBehavior passHref>
                  <NavigationMenuLink className={cn(
                    "text-black no-underline px-4 py-2 hover:text-primary transition-colors duration-200",
                    isActive('/contact') && "font-bold text-primary"
                  )}>
                    Contact
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              {isAuthenticated && (
                <>
                  <NavigationMenuItem>
                    <Link to="/disease-prediction" legacyBehavior passHref>
                      <NavigationMenuLink className={cn(
                        "text-black no-underline px-4 py-2 hover:text-primary transition-colors duration-200",
                        isActive('/disease-prediction') && "font-bold text-primary"
                      )}>
                        Disease Prediction
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <Link to="/enhanced-disease-prediction" legacyBehavior passHref>
                      <NavigationMenuLink className={cn(
                        "text-black no-underline px-4 py-2 hover:text-primary transition-colors duration-200",
                        isActive('/disease-prediction') && "font-bold text-primary"
                      )}>
                        Enhanced Disease Prediction
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <Link to="/malaria-detection" legacyBehavior passHref>
                      <NavigationMenuLink className={cn(
                        "text-black no-underline px-4 py-2 hover:text-primary transition-colors duration-200",
                        isActive('/malaria-detection') && "font-bold text-primary"
                      )}>
                        Malaria Detection
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                </>
              )}
            </NavigationMenuList>
          </NavigationMenu>
          
          {/* Mobile Navigation */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="grid gap-4 py-4">
                <Link to="/" className={cn(
                  "flex items-center py-2 text-lg font-medium text-black no-underline hover:text-primary transition-colors duration-200",
                  isActive('/') && "text-primary"
                )}>
                  Home
                </Link>
                <Link to="/about" className={cn(
                  "flex items-center py-2 text-lg font-medium text-black no-underline hover:text-primary transition-colors duration-200",
                  isActive('/about') && "text-primary"
                )}>
                  About
                </Link>
                <Link to="/services" className={cn(
                  "flex items-center py-2 text-lg font-medium text-black no-underline hover:text-primary transition-colors duration-200",
                  isActive('/services') && "text-primary"
                )}>
                  Services
                </Link>
                <Link to="/contact" className={cn(
                  "flex items-center py-2 text-lg font-medium text-black no-underline hover:text-primary transition-colors duration-200",
                  isActive('/contact') && "text-primary"
                )}>
                  Contact
                </Link>
                {isAuthenticated && (
                  <>
                    <Link to="/disease-prediction" className={cn(
                      "flex items-center py-2 text-lg font-medium text-black no-underline hover:text-primary transition-colors duration-200",
                      isActive('/disease-prediction') && "text-primary"
                    )}>
                      Disease Prediction
                    </Link>
                    <Link to="/malaria-detection" className={cn(
                      "flex items-center py-2 text-lg font-medium text-black no-underline hover:text-primary transition-colors duration-200",
                      isActive('/malaria-detection') && "text-primary"
                    )}>
                      Malaria Detection
                    </Link>
                    <Link to="/dashboard" className={cn(
                      "flex items-center py-2 text-lg font-medium text-black no-underline hover:text-primary transition-colors duration-200",
                      isActive('/dashboard') && "text-primary"
                    )}>
                      Dashboard
                    </Link>
                    <Link to="/profile" className={cn(
                      "flex items-center py-2 text-lg font-medium text-black no-underline hover:text-primary transition-colors duration-200",
                      isActive('/profile') && "text-primary"
                    )}>
                      My Profile
                    </Link>
                    <Link to="/diagnostic-history" className={cn(
                      "flex items-center py-2 text-lg font-medium text-black no-underline hover:text-primary transition-colors duration-200",
                      isActive('/diagnostic-history') && "text-primary"
                    )}>
                      Health Records
                    </Link>
                    <button 
                      onClick={logout}
                      className="flex items-center py-2 text-lg font-medium text-destructive no-underline"
                    >
                      Logout
                    </button>
                  </>
                )}
                {!isAuthenticated && (
                  <div className="flex flex-col gap-2 mt-4">
                    <Button asChild variant="outline" className="text-black no-underline">
                      <Link to="/login">Login</Link>
                    </Button>
                    <Button asChild variant="default" className="bg-black text-white hover:bg-gray-800 no-underline">
                      <Link to="/register">Register</Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
          
          {/* User Actions */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userProfile?.avatar} alt={userProfile?.username || 'User'} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {userProfile?.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userProfile?.username || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {userProfile?.email || ''}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="no-underline">Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="no-underline">My Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/diagnostic-history" className="no-underline">Health Records</Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                    onClick={logout}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" className="text-black border-black hover:bg-gray-100 hover:text-black no-underline">
                  <Link to="/login">Login</Link>
                </Button>
                <Button asChild className="bg-black text-white hover:bg-gray-800 no-underline">
                  <Link to="/register">Register</Link>
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
