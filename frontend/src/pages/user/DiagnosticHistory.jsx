import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Spinner, Alert, Tabs, Tab } from 'react-bootstrap';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { diagnosticService } from '../../services/api';

const DiagnosticHistory = () => {
  const [history, setHistory] = useState({
    malaria: [],
    disease: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('malaria');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await diagnosticService.getDiagnosticHistory();
        setHistory(data);
      } catch (error) {
        setError('Failed to load diagnostic history. Please try again later.');
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const renderMalariaHistory = () => {
    if (history.malaria.length === 0) {
      return (
        <Alert variant="info">
          <i className="fas fa-info-circle me-2"></i>
          No malaria diagnostic history found.
        </Alert>
      );
    }

    return (
      <Table responsive striped hover>
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Result</th>
            <th>Confidence</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {history.malaria.map((item, index) => (
            <tr key={item.id}>
              <td>{index + 1}</td>
              <td>{new Date(item.created_at).toLocaleString()}</td>
              <td>
                <Badge bg={item.is_infected ? 'danger' : 'success'}>
                  {item.is_infected ? 'Infected' : 'Not Infected'}
                </Badge>
              </td>
              <td>{(item.confidence * 100).toFixed(2)}%</td>
              <td>
                <Button variant="outline-primary" size="sm">
                  <i className="fas fa-eye me-1"></i>
                  View Details
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  const renderDiseaseHistory = () => {
    if (history.disease.length === 0) {
      return (
        <Alert variant="info">
          <i className="fas fa-info-circle me-2"></i>
          No disease prediction history found.
        </Alert>
      );
    }

    return (
      <Table responsive striped hover>
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Symptoms</th>
            <th>Predicted Disease</th>
            <th>Confidence</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {history.disease.map((item, index) => (
            <tr key={item.id}>
              <td>{index + 1}</td>
              <td>{new Date(item.created_at).toLocaleString()}</td>
              <td>
                {item.symptoms.slice(0, 3).map((symptom, i) => (
                  <Badge bg="secondary" className="me-1 mb-1 text-capitalize" key={i}>
                  {symptom.replace(/_/g, ' ')}
                </Badge>
              ))}
              {item.symptoms.length > 3 && (
                <Badge bg="secondary">+{item.symptoms.length - 3} more</Badge>
              )}
            </td>
            <td className="text-capitalize">{item.predicted_disease.replace(/_/g, ' ')}</td>
            <td>
              <Badge bg={
                item.confidence === 'High' ? 'danger' : 
                item.confidence === 'Medium' ? 'warning' : 'info'
              }>
                {item.confidence}
              </Badge>
            </td>
            <td>
              <Button variant="outline-primary" size="sm">
                <i className="fas fa-eye me-1"></i>
                View Details
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

return (
  <>
    <Header />
    <Container className="py-5">
      <h2 className="mb-4">Diagnostic History</h2>
      
      {error && (
        <Alert variant="danger">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading your diagnostic history...</p>
        </div>
      ) : (
        <Card className="shadow-sm">
          <Card.Body>
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="mb-4"
            >
              <Tab eventKey="malaria" title="Malaria Detection">
                {renderMalariaHistory()}
              </Tab>
              <Tab eventKey="disease" title="Disease Prediction">
                {renderDiseaseHistory()}
              </Tab>
            </Tabs>
          </Card.Body>
        </Card>
      )}
    </Container>
    <Footer />
  </>
);
};

export default DiagnosticHistory;