import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Spinner, Alert, Form, Modal, Tabs, Tab } from 'react-bootstrap';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const PharmacyDashboard = () => {
  const { userProfile } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('prescriptions');

  useEffect(() => {
    const fetchPharmacyData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // In a real application, you would implement these API endpoints
        const inventoryResponse = await api.get('pharmacy/inventory/');
        const prescriptionsResponse = await api.get('pharmacy/prescriptions/');
        
        setInventory(inventoryResponse.data);
        setPrescriptions(prescriptionsResponse.data);
      } catch (error) {
        setError('Failed to load pharmacy data. Please try again later.');
        console.error('Error fetching pharmacy data:', error);
      } finally {
        setLoading(false);
      }
    };

    // For demo purposes, let's simulate the API responses
    const simulateApiResponses = () => {
      setLoading(true);
      
      // Simulate delay
      setTimeout(() => {
        // Mock inventory data
        const mockInventory = [
          { id: 1, name: 'Paracetamol', category: 'Pain Reliever', stock: 150, unit: 'tablets', price: 5.99, expiry_date: '2024-06-30' },
          { id: 2, name: 'Amoxicillin', category: 'Antibiotic', stock: 80, unit: 'capsules', price: 12.50, expiry_date: '2024-03-15' },
          { id: 3, name: 'Artemether/Lumefantrine', category: 'Antimalarial', stock: 45, unit: 'tablets', price: 18.75, expiry_date: '2024-05-20' },
          { id: 4, name: 'Loratadine', category: 'Antihistamine', stock: 100, unit: 'tablets', price: 8.25, expiry_date: '2024-08-10' },
          { id: 5, name: 'Insulin', category: 'Hormone', stock: 30, unit: 'vials', price: 45.00, expiry_date: '2023-12-15' }
        ];
        
        // Mock prescriptions data
        const mockPrescriptions = [
          { 
            id: 1, 
            patient_name: 'John Doe', 
            patient_email: 'john@example.com',
            patient_phone: '123-456-7890',
            doctor_name: 'Dr. Sarah Wilson',
            date_issued: '2023-06-18T10:30:00Z',
            status: 'pending',
            items: [
              { medication: 'Paracetamol', dosage: '500mg', frequency: 'Every 6 hours', duration: '5 days', quantity: 20 },
              { medication: 'Loratadine', dosage: '10mg', frequency: 'Once daily', duration: '7 days', quantity: 7 }
            ]
          },
          { 
            id: 2, 
            patient_name: 'Jane Smith', 
            patient_email: 'jane@example.com',
            patient_phone: '987-654-3210',
            doctor_name: 'Dr. Michael Brown',
            date_issued: '2023-06-17T14:45:00Z',
            status: 'completed',
            date_fulfilled: '2023-06-17T16:30:00Z',
            items: [
              { medication: 'Amoxicillin', dosage: '250mg', frequency: 'Every 8 hours', duration: '7 days', quantity: 21 }
            ]
          },
          { 
            id: 3, 
            patient_name: 'Michael Johnson', 
            patient_email: 'michael@example.com',
            patient_phone: '555-123-4567',
            doctor_name: 'Dr. Sarah Wilson',
            date_issued: '2023-06-15T09:15:00Z',
            status: 'completed',
            date_fulfilled: '2023-06-15T11:20:00Z',
            items: [
              { medication: 'Artemether/Lumefantrine', dosage: '20/120mg', frequency: 'Twice daily', duration: '3 days', quantity: 6 }
            ]
          }
        ];
        
        setInventory(mockInventory);
        setPrescriptions(mockPrescriptions);
        setLoading(false);
      }, 1000);
    };

    // Use the simulation for demo
    simulateApiResponses();
    
    // In a real application, you would use:
    // fetchPharmacyData();
  }, []);

  const handlePrescriptionClick = (prescription) => {
    setSelectedPrescription(prescription);
    setShowPrescriptionModal(true);
  };

  const handleClosePrescriptionModal = () => {
    setShowPrescriptionModal(false);
    setSelectedPrescription(null);
  };

  const handleFulfillPrescription = (id) => {
    // In a real application, you would make an API call to update the prescription status
    setPrescriptions(prescriptions.map(prescription => 
      prescription.id === id 
        ? { 
            ...prescription, 
            status: 'completed', 
            date_fulfilled: new Date().toISOString() 
          } 
        : prescription
    ));
    setShowPrescriptionModal(false);
  };

  const filteredPrescriptions = prescriptions.filter(prescription => 
    prescription.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prescription.patient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prescription.doctor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!userProfile || userProfile.user_type !== 'pharmacy') {
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
        <h2 className="mb-4">Pharmacy Dashboard</h2>
        
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
                <div className="display-4 mb-2">{inventory.length}</div>
                <div className="text-center">
                  <i className="fas fa-pills me-2"></i>
                  Medications in Stock
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4} className="mb-3">
            <Card className="shadow-sm h-100 bg-warning text-white">
              <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                <div className="display-4 mb-2">
                  {prescriptions.filter(p => p.status === 'pending').length}
                </div>
                <div className="text-center">
                  <i className="fas fa-clipboard-list me-2"></i>
                  Pending Prescriptions
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4} className="mb-3">
            <Card className="shadow-sm h-100 bg-success text-white">
              <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                <div className="display-4 mb-2">
                  {prescriptions.filter(p => p.status === 'completed').length}
                </div>
                <div className="text-center">
                  <i className="fas fa-check-circle me-2"></i>
                  Fulfilled Prescriptions
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        <Card className="shadow-sm">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="mb-0">Pharmacy Management</h4>
              <Form.Control
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ maxWidth: '300px' }}
              />
            </div>
            
            {loading ? (
              <div className="text-center my-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading pharmacy data...</p>
              </div>
            ) : (
              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-3"
              >
                <Tab eventKey="prescriptions" title="Prescriptions">
                  {filteredPrescriptions.length === 0 ? (
                    <Alert variant="info">
                      <i className="fas fa-info-circle me-2"></i>
                      No prescriptions found.
                    </Alert>
                  ) : (
                    <Table responsive striped hover>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Patient</th>
                          <th>Doctor</th>
                          <th>Date Issued</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPrescriptions.map(prescription => (
                          <tr key={prescription.id}>
                            <td>{prescription.id}</td>
                            <td>{prescription.patient_name}</td>
                            <td>{prescription.doctor_name}</td>
                            <td>{new Date(prescription.date_issued).toLocaleDateString()}</td>
                            <td>
                              <Badge bg={prescription.status === 'pending' ? 'warning' : 'success'}>
                                {prescription.status === 'pending' ? 'Pending' : 'Completed'}
                              </Badge>
                            </td>
                            <td>
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={() => handlePrescriptionClick(prescription)}
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
                </Tab>
                <Tab eventKey="inventory" title="Inventory">
                  {filteredInventory.length === 0 ? (
                    <Alert variant="info">
                      <i className="fas fa-info-circle me-2"></i>
                      No inventory items found.
                    </Alert>
                  ) : (
                    <Table responsive striped hover>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Category</th>
                          <th>Stock</th>
                          <th>Unit</th>
                          <th>Price</th>
                          <th>Expiry Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInventory.map(item => (
                          <tr key={item.id}>
                            <td>{item.name}</td>
                            <td>{item.category}</td>
                            <td>{item.stock}</td>
                            <td>{item.unit}</td>
                            <td>${item.price.toFixed(2)}</td>
                            <td>{item.expiry_date}</td>
                            <td>
                              <Badge bg={
                                item.stock > 50 ? 'success' : 
                                item.stock > 20 ? 'warning' : 'danger'
                              }>
                                {item.stock > 50 ? 'In Stock' : 
                                 item.stock > 20 ? 'Low Stock' : 'Critical Stock'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Tab>
              </Tabs>
            )}
          </Card.Body>
        </Card>
        
        {/* Prescription Details Modal */}
        <Modal 
          show={showPrescriptionModal} 
          onHide={handleClosePrescriptionModal}
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>Prescription Details</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedPrescription && (
              <>
                <Row className="mb-4">
                  <Col md={6}>
                    <h5>Patient Information</h5>
                    <p className="mb-1"><strong>Name:</strong> {selectedPrescription.patient_name}</p>
                    <p className="mb-1"><strong>Email:</strong> {selectedPrescription.patient_email}</p>
                    <p className="mb-1"><strong>Phone:</strong> {selectedPrescription.patient_phone}</p>
                  </Col>
                  <Col md={6}>
                    <h5>Prescription Information</h5>
                    <p className="mb-1"><strong>Doctor:</strong> {selectedPrescription.doctor_name}</p>
                    <p className="mb-1"><strong>Date Issued:</strong> {new Date(selectedPrescription.date_issued).toLocaleString()}</p>
                    <p className="mb-1">
                      <strong>Status:</strong> 
                      <Badge bg={selectedPrescription.status === 'pending' ? 'warning' : 'success'} className="ms-2">
                        {selectedPrescription.status === 'pending' ? 'Pending' : 'Completed'}
                      </Badge>
                    </p>
                    {selectedPrescription.status === 'completed' && (
                      <p className="mb-1"><strong>Date Fulfilled:</strong> {new Date(selectedPrescription.date_fulfilled).toLocaleString()}</p>
                    )}
                  </Col>
                </Row>
                
                <h5 className="mb-3">Prescribed Medications</h5>
                <Table responsive striped size="sm">
                  <thead>
                    <tr>
                      <th>Medication</th>
                      <th>Dosage</th>
                      <th>Frequency</th>
                      <th>Duration</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPrescription.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.medication}</td>
                        <td>{item.dosage}</td>
                        <td>{item.frequency}</td>
                        <td>{item.duration}</td>
                        <td>{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClosePrescriptionModal}>
              Close
            </Button>
            {selectedPrescription && selectedPrescription.status === 'pending' && (
              <Button 
                variant="success" 
                onClick={() => handleFulfillPrescription(selectedPrescription.id)}
              >
                <i className="fas fa-check-circle me-1"></i>
                Mark as Fulfilled
              </Button>
            )}
          </Modal.Footer>
        </Modal>
      </Container>
      <Footer />
    </>
  );
};

export default PharmacyDashboard;