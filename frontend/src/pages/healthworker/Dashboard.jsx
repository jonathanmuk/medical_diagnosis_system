import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Spinner, Alert, Form, Modal } from 'react-bootstrap';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const HealthWorkerDashboard = () => {
  const { userProfile } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // In a real application, you would implement this API endpoint
        const response = await api.get('health-worker/patients/');
        setPatients(response.data);
      } catch (error) {
        setError('Failed to load patients. Please try again later.');
        console.error('Error fetching patients:', error);
      } finally {
        setLoading(false);
      }
    };

    // For demo purposes, let's simulate the API response
    const simulateApiResponse = () => {
      setLoading(true);
      
      // Simulate delay
      setTimeout(() => {
        // Mock patients data
        const mockPatients = [
          { 
            id: 1, 
            name: 'John Doe', 
            email: 'john@example.com', 
            age: 35, 
            gender: 'Male',
            phone: '123-456-7890',
            last_visit: '2023-06-15T10:30:00Z',
            medical_history: [
              { date: '2023-06-15', diagnosis: 'Common Cold', notes: 'Prescribed rest and fluids' },
              { date: '2023-05-10', diagnosis: 'Allergic Rhinitis', notes: 'Prescribed antihistamines' }
            ],
            diagnostic_results: [
              { 
                type: 'malaria', 
                date: '2023-06-15T10:30:00Z', 
                result: 'Negative', 
                confidence: 0.95 
              },
              { 
                type: 'disease', 
                date: '2023-06-15T10:35:00Z', 
                symptoms: ['cough', 'fever', 'fatigue'], 
                result: 'Common Cold', 
                confidence: 'Medium' 
              }
            ]
          },
          { 
            id: 2, 
            name: 'Jane Smith', 
            email: 'jane@example.com', 
            age: 42, 
            gender: 'Female',
            phone: '987-654-3210',
            last_visit: '2023-06-18T14:45:00Z',
            medical_history: [
              { date: '2023-06-18', diagnosis: 'Hypertension', notes: 'Prescribed blood pressure medication' },
              { date: '2023-04-22', diagnosis: 'Migraine', notes: 'Prescribed pain relievers' }
            ],
            diagnostic_results: [
              { 
                type: 'disease', 
                date: '2023-06-18T14:45:00Z', 
                symptoms: ['headache', 'dizziness', 'blurred_vision'], 
                result: 'Hypertension', 
                confidence: 'High' 
              }
            ]
          },
          { 
            id: 3, 
            name: 'Michael Johnson', 
            email: 'michael@example.com', 
            age: 28, 
            gender: 'Male',
            phone: '555-123-4567',
            last_visit: '2023-06-10T09:15:00Z',
            medical_history: [
              { date: '2023-06-10', diagnosis: 'Malaria', notes: 'Prescribed antimalarial medication' }
            ],
            diagnostic_results: [
              { 
                type: 'malaria', 
                date: '2023-06-10T09:15:00Z', 
                result: 'Positive', 
                confidence: 0.92 
              }
            ]
          }
        ];
        
        setPatients(mockPatients);
        setLoading(false);
      }, 1000);
    };

    // Use the simulation for demo
    simulateApiResponse();
    
    // In a real application, you would use:
    // fetchPatients();
  }, []);

  const handlePatientClick = (patient) => {
    setSelectedPatient(patient);
    setShowPatientModal(true);
  };

  const handleClosePatientModal = () => {
    setShowPatientModal(false);
    setSelectedPatient(null);
  };

  const filteredPatients = patients.filter(patient => 
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!userProfile || userProfile.user_type !== 'health_worker') {
    return (
      <>
        <Header />
        <Container className="py-5">
          <Alert variant="danger">
            <i className="fas fa-exclamation-triangle me-2"></i>
            You do not have permission to access this page.
          </Alert>
        </Container>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <Container className="py-5">
        <h2 className="mb-4">Health Worker Dashboard</h2>
        
        {error && (
          <Alert variant="danger">
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
          </Alert>
        )}
        
        <Row className="mb-4">
          <Col md={4} className="mb-3">
            <Card className="shadow-sm h-100 bg-primary text-white">
              <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                <div className="display-4 mb-2">{patients.length}</div>
                <div className="text-center">
                  <i className="fas fa-users me-2"></i>
                  Total Patients
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={8} className="mb-3">
            <Card className="shadow-sm h-100">
              <Card.Body>
                <h5 className="mb-3">Health Worker Profile</h5>
                <Row>
                  <Col md={6}>
                    <p><strong>Name:</strong> {userProfile?.username}</p>
                    <p><strong>Email:</strong> {userProfile?.email}</p>
                    <p><strong>Phone:</strong> {userProfile?.phone_number || 'Not provided'}</p>
                  </Col>
                  <Col md={6}>
                    <p><strong>Qualification:</strong> {userProfile?.qualification || 'Not provided'}</p>
                    <p><strong>Specialization:</strong> {userProfile?.specialization || 'Not provided'}</p>
                    <p><strong>Member since:</strong> {userProfile?.date_joined ? new Date(userProfile.date_joined).toLocaleDateString() : 'Unknown'}</p>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        <Card className="shadow-sm">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="mb-0">Patient Management</h4>
              <Form.Control
                type="text"
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ maxWidth: '300px' }}
              />
            </div>
            
            {loading ? (
              <div className="text-center my-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading patients...</p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <Alert variant="info">
                <i className="fas fa-info-circle me-2"></i>
                No patients found.
              </Alert>
            ) : (
              <Table responsive striped hover>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>Last Visit</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map(patient => (
                    <tr key={patient.id}>
                      <td>{patient.name}</td>
                      <td>{patient.email}</td>
                      <td>{patient.age}</td>
                      <td>{patient.gender}</td>
                      <td>{new Date(patient.last_visit).toLocaleDateString()}</td>
                      <td>
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={() => handlePatientClick(patient)}
                        >
                          <i className="fas fa-eye me-1"></i>
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
        
        {/* Patient Details Modal */}
        <Modal 
          show={showPatientModal} 
          onHide={handleClosePatientModal}
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>Patient Details</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedPatient && (
              <>
                <Row className="mb-4">
                  <Col md={6}>
                    <h5>{selectedPatient.name}</h5>
                    <p className="text-muted mb-0">{selectedPatient.email}</p>
                    <p className="text-muted mb-0">{selectedPatient.phone}</p>
                  </Col>
                  <Col md={6} className="text-md-end">
                    <p className="mb-0"><strong>Age:</strong> {selectedPatient.age}</p>
                    <p className="mb-0"><strong>Gender:</strong> {selectedPatient.gender}</p>
                    <p className="mb-0"><strong>Last Visit:</strong> {new Date(selectedPatient.last_visit).toLocaleDateString()}</p>
                  </Col>
                </Row>
                
                <h6 className="mb-3">Medical History</h6>
                <Table responsive striped size="sm" className="mb-4">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Diagnosis</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPatient.medical_history.map((record, index) => (
                      <tr key={index}>
                        <td>{record.date}</td>
                        <td>{record.diagnosis}</td>
                        <td>{record.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                
                <h6 className="mb-3">Diagnostic Results</h6>
                <Table responsive striped size="sm">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Result</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPatient.diagnostic_results.map((result, index) => (
                      <tr key={index}>
                        <td>{new Date(result.date).toLocaleDateString()}</td>
                        <td className="text-capitalize">{result.type}</td>
                        <td>
                          {result.type === 'malaria' ? (
                            <Badge bg={result.result === 'Positive' ? 'danger' : 'success'}>
                              {result.result}
                            </Badge>
                          ) : (
                            <span className="text-capitalize">{result.result}</span>
                          )}
                        </td>
                        <td>
                          {result.type === 'malaria' ? (
                            <span>Confidence: {(result.confidence * 100).toFixed(2)}%</span>
                          ) : (
                            <div>
                              <span>Symptoms: </span>
                              {result.symptoms.map((symptom, i) => (
                                <Badge bg="secondary" className="me-1 mb-1 text-capitalize" key={i}>
                                  {symptom.replace(/_/g, ' ')}
                                </Badge>
                              ))}
                              <div className="mt-1">
                                <span>Confidence: </span>
                                <Badge bg={
                                  result.confidence === 'High' ? 'danger' : 
                                  result.confidence === 'Medium' ? 'warning' : 'info'
                                }>
                                  {result.confidence}
                                </Badge>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </Table>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClosePatientModal}>
              Close
            </Button>
            <Button variant="primary">
              <i className="fas fa-edit me-1"></i>
              Add Medical Record
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
      <Footer />
    </>
  );
};

export default HealthWorkerDashboard;
