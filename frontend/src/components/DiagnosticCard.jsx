import React from 'react';
import { Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const DiagnosticCard = ({ title, description, icon, linkTo }) => {
  return (
    <Card className="h-100 shadow-sm">
      <Card.Body className="d-flex flex-column">
        <div className="text-center mb-3">
          <i className={`${icon} fa-3x text-primary`}></i>
        </div>
        <Card.Title className="text-center">{title}</Card.Title>
        <Card.Text className="flex-grow-1">{description}</Card.Text>
        <div className="text-center mt-auto">
          <Button as={Link} to={linkTo} variant="primary">
            Start Diagnosis
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default DiagnosticCard;
