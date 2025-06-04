import React, { useState } from 'react';
import { Container, Row, Col, Card, Tab, Nav, Alert } from 'react-bootstrap';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import MalariaDetection from './MalariaDetection';
import DiseasePredictor from './DiseasePredictor';
import { useAuth } from '../../context/AuthContext';

const Dashboard = () => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('malaria');
  
  return (
    <>
      <Header />
      <Container className="py-5">
        <h2 className="mb-4">Dashboard</h2>
        
        <Row className="mb-4">
          <Col>
            <Card className="shadow-sm">
              <Card.Body>
                <h5 className="card-title">Welcome, {userProfile?.username || 'User'}</h5>
                <p className="card-text">
                  Use our AI-powered diagnostic tools to get quick health insights. 
                  Please note that these tools are meant to assist, not replace professional medical advice.
                </p>
                <Alert variant="info">
                  <i className="fas fa-info-circle me-2"></i>
                  For accurate results, please provide clear images for malaria detection and select all relevant symptoms for disease prediction.
                </Alert>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        <Row>
          <Col>
            <Card className="shadow-sm">
              <Card.Body>
                <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
                  <Nav variant="tabs" className="mb-3">
                    <Nav.Item>
                      <Nav.Link eventKey="malaria">
                        <i className="fas fa-microscope me-2"></i>
                        Malaria Detection
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link eventKey="disease">
                        <i className="fas fa-stethoscope me-2"></i>
                        Disease Prediction
                      </Nav.Link>
                    </Nav.Item>
                  </Nav>
                  
                  <Tab.Content>
                    <Tab.Pane eventKey="malaria">
                      <MalariaDetection />
                    </Tab.Pane>
                    <Tab.Pane eventKey="disease">
                      <DiseasePredictor />
                    </Tab.Pane>
                  </Tab.Content>
                </Tab.Container>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
      <Footer />
    </>
  );
};

export default Dashboard;
