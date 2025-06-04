import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Spinner, Alert, Tabs, Tab } from 'react-bootstrap';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const AdminDashboard = () => {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [diagnostics, setDiagnostics] = useState({
    malaria: [],
    disease: []
  });
  const [stats, setStats] = useState({
    total_users: 0,
    total_diagnostics: 0,
    user_types: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // In a real application, you would implement these API endpoints
        const usersResponse = await api.get('admin/users/');
        const diagnosticsResponse = await api.get('admin/diagnostics/');
        const statsResponse = await api.get('admin/stats/');
        
        setUsers(usersResponse.data);
        setDiagnostics(diagnosticsResponse.data);
        setStats(statsResponse.data);
      } catch (error) {
        setError('Failed to load admin data. Please try again later.');
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    // For demo purposes, let's simulate the API responses
    const simulateApiResponses = () => {
      setLoading(true);
      
      // Simulate delay
      setTimeout(() => {
        // Mock users data
        const mockUsers = [
          { id: 1, username: 'john_doe', email: 'john@example.com', user_type: 'user', date_joined: '2023-01-15T10:30:00Z', is_active: true },
          { id: 2, username: 'jane_smith', email: 'jane@example.com', user_type: 'health_worker', date_joined: '2023-02-20T14:45:00Z', is_active: true },
          { id: 3, username: 'city_pharmacy', email: 'pharmacy@example.com', user_type: 'pharmacy', date_joined: '2023-03-10T09:15:00Z', is_active: true },
          { id: 4, username: 'general_hospital', email: 'hospital@example.com', user_type: 'hospital', date_joined: '2023-04-05T11:20:00Z', is_active: true },
          { id: 5, username: 'inactive_user', email: 'inactive@example.com', user_type: 'user', date_joined: '2023-05-12T16:30:00Z', is_active: false }
        ];
        
        // Mock diagnostics data
        const mockDiagnostics = {
          malaria: [
            { id: 1, user_id: 1, user_email: 'john@example.com', created_at: '2023-06-10T13:45:00Z', is_infected: true, confidence: 0.92 },
            { id: 2, user_id: 3, user_email: 'jane@example.com', created_at: '2023-06-15T10:30:00Z', is_infected: false, confidence: 0.88 }
          ],
          disease: [
            { id: 1, user_id: 1, user_email: 'john@example.com', created_at: '2023-06-12T14:20:00Z', symptoms: ['fever', 'headache', 'fatigue'], predicted_disease: 'common_cold', confidence: 'Medium' },
            { id: 2, user_id: 2, user_email: 'jane@example.com', created_at: '2023-06-18T09:15:00Z', symptoms: ['joint_pain', 'fever', 'rash'], predicted_disease: 'dengue', confidence: 'High' }
          ]
        };
        
        // Mock stats data
        const mockStats = {
          total_users: 5,
          total_diagnostics: 4,
          user_types: {
            user: 2,
            health_worker: 1,
            pharmacy: 1,
            hospital: 1
          }
        };
        
        setUsers(mockUsers);
        setDiagnostics(mockDiagnostics);
        setStats(mockStats);
        setLoading(false);
      }, 1000);
    };

    // Use the simulation for demo
    simulateApiResponses();
    
    // In a real application, you would use:
    // fetchAdminData();
  }, []);

  if (!userProfile || userProfile.user_type !== 'admin') {
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
        <h2 className="mb-4">Admin Dashboard</h2>
        
        {error && (
          <Alert variant="danger">
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
          </Alert>
        )}
        
        {loading ? (
          <div className="text-center my-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Loading admin data...</p>
          </div>
        ) : (
          <>
            <Row className="mb-4">
              <Col md={4} className="mb-3">
                <Card className="shadow-sm h-100 bg-primary text-white">
                  <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                    <div className="display-4 mb-2">{stats.total_users}</div>
                    <div className="text-center">
                      <i className="fas fa-users me-2"></i>
                      Total Users
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4} className="mb-3">
                <Card className="shadow-sm h-100 bg-success text-white">
                  <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                    <div className="display-4 mb-2">{stats.total_diagnostics}</div>
                    <div className="text-center">
                      <i className="fas fa-stethoscope me-2"></i>
                      Total Diagnostics
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4} className="mb-3">
                <Card className="shadow-sm h-100 bg-info text-white">
                  <Card.Body>
                    <h5 className="text-center mb-3">User Types</h5>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Regular Users:</span>
                      <span>{stats.user_types.user || 0}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Health Workers:</span>
                      <span>{stats.user_types.health_worker || 0}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Pharmacies:</span>
                      <span>{stats.user_types.pharmacy || 0}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Hospitals:</span>
                      <span>{stats.user_types.hospital || 0}</span>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
            
            <Card className="shadow-sm mb-4">
              <Card.Body>
                <h4 className="mb-3">User Management</h4>
                <Table responsive striped hover>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>User Type</th>
                      <th>Joined</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td>{user.username}</td>
                        <td>{user.email}</td>
                        <td className="text-capitalize">{user.user_type.replace(/_/g, ' ')}</td>
                        <td>{new Date(user.date_joined).toLocaleDateString()}</td>
                        <td>
                          <Badge bg={user.is_active ? 'success' : 'danger'}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td>
                          <Button variant="outline-primary" size="sm" className="me-2">
                            <i className="fas fa-edit"></i>
                          </Button>
                          <Button variant={user.is_active ? 'outline-danger' : 'outline-success'} size="sm">
                            <i className={`fas fa-${user.is_active ? 'ban' : 'check'}`}></i>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
            
            <Card className="shadow-sm">
              <Card.Body>
                <h4 className="mb-3">Diagnostic Records</h4>
                <Tabs defaultActiveKey="malaria" className="mb-3">
                  <Tab eventKey="malaria" title="Malaria Detection">
                    <Table responsive striped hover>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>User</th>
                          <th>Date</th>
                          <th>Result</th>
                          <th>Confidence</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diagnostics.malaria.map(record => (
                          <tr key={record.id}>
                            <td>{record.id}</td>
                            <td>{record.user_email}</td>
                            <td>{new Date(record.created_at).toLocaleString()}</td>
                            <td>
                              <Badge bg={record.is_infected ? 'danger' : 'success'}>
                                {record.is_infected ? 'Infected' : 'Not Infected'}
                              </Badge>
                            </td>
                            <td>{(record.confidence * 100).toFixed(2)}%</td>
                            <td>
                              <Button variant="outline-primary" size="sm" className="me-2">
                                <i className="fas fa-eye"></i>
                              </Button>
                              <Button variant="outline-danger" size="sm">
                                <i className="fas fa-trash"></i>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Tab>
                  <Tab eventKey="disease" title="Disease Prediction">
                    <Table responsive striped hover>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>User</th>
                          <th>Date</th>
                          <th>Symptoms</th>
                          <th>Predicted Disease</th>
                          <th>Confidence</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diagnostics.disease.map(record => (
                          <tr key={record.id}>
                            <td>{record.id}</td>
                            <td>{record.user_email}</td>
                            <td>{new Date(record.created_at).toLocaleString()}</td>
                            <td>
                              {record.symptoms.slice(0, 2).map((symptom, i) => (
                                <Badge bg="secondary" className="me-1 mb-1 text-capitalize" key={i}>
                                {symptom.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                            {record.symptoms.length > 2 && (
                              <Badge bg="secondary">+{record.symptoms.length - 2} more</Badge>
                            )}
                          </td>
                          <td className="text-capitalize">{record.predicted_disease.replace(/_/g, ' ')}</td>
                          <td>
                            <Badge bg={
                              record.confidence === 'High' ? 'danger' : 
                              record.confidence === 'Medium' ? 'warning' : 'info'
                            }>
                              {record.confidence}
                            </Badge>
                          </td>
                          <td>
                            <Button variant="outline-primary" size="sm" className="me-2">
                              <i className="fas fa-eye"></i>
                            </Button>
                            <Button variant="outline-danger" size="sm">
                              <i className="fas fa-trash"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </>
      )}
    </Container>
    <Footer />
  </>
);
};

export default AdminDashboard;