import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const NotFoundPage = () => {
  return (
    <>
      <Header />
      <Container className="py-5 text-center">
        <Row className="justify-content-center">
          <Col md={8}>
            <h1 className="display-1 fw-bold">404</h1>
            <h2 className="mb-4">Page Not Found</h2>
            <p className="lead mb-5">
              The page you are looking for might have been removed, had its name changed,
              or is temporarily unavailable.
            </p>
            <Button as={Link} to="/" variant="primary" size="lg">
              Go to Homepage
            </Button>
          </Col>
        </Row>
      </Container>
      <Footer />
    </>
  );
};

export default NotFoundPage;
