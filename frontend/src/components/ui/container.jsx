import React from "react";

export function Container({ className, children, ...props }) {
  return (
    <div 
      className={`container mx-auto px-4 md:px-6 ${className || ""}`}
      {...props}
    >
      {children}
    </div>
  );
}