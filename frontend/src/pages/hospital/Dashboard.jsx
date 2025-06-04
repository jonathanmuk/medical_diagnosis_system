import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Spinner, Alert, Form, Modal, Tabs, Tab } from 'react-bootstrap';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const HospitalDashboard = () => {
  const { userProfile } = useAuth();
  const [patients, setPatients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('patients');

  useEffect(() => {
    const fetchHospitalData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // In a real application, you would implement these API endpoints
        const patientsResponse = await api.get('hospital/patients/');
        const staffResponse = await api.get('hospital/staff/');
        const appointmentsResponse = await api.get('hospital/appointments/');
        
        setPatients(patientsResponse.data);
        setStaff(staffResponse.data);
        setAppointments(appointmentsResponse.data);
      } catch (error) {
        setError('Failed to load hospital data. Please try again later.');
        console.error('Error fetching hospital data:', error);
      } finally {
        setLoading(false);
      }
    };

    // For demo purposes, let's simulate the API responses
    const simulateApiResponses = () => {
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
            address: '123 Main St, Anytown',
            blood_type: 'O+',
            admission_date: '2023-06-15T10:30:00Z',
            discharge_date: null,
            status: 'admitted',
            department: 'General Medicine',
            diagnosis: 'Pneumonia',
            doctor: 'Dr. Sarah Wilson'
          },
          { 
            id: 2, 
            name: 'Jane Smith', 
            email: 'jane@example.com', 
            age: 42, 
            gender: 'Female',
            phone: '987-654-3210',
            address: '456 Oak Ave, Somewhere',
            blood_type: 'A-',
            admission_date: '2023-06-10T14:45:00Z',
            discharge_date: '2023-06-17T11:30:00Z',
            status: 'discharged',
            department: 'Cardiology',
            diagnosis: 'Hypertension',
            doctor: 'Dr. Michael Brown'
          },
          { 
            id: 3, 
            name: 'Michael Johnson', 
            email: 'michael@example.com', 
            age: 28, 
            gender: 'Male',
            phone: '555-123-4567',
            address: '789 Pine Rd, Elsewhere',
            blood_type: 'B+',
            admission_date: '2023-06-18T09:15:00Z',
            discharge_date: null,
            status: 'admitted',
            department: 'Infectious Diseases',
            diagnosis: 'Malaria',
            doctor: 'Dr. Sarah Wilson'
          }
        ];
        
        // Mock staff data
        const mockStaff = [
          { id: 1, name: 'Dr. Sarah Wilson', role: 'Doctor', department: 'General Medicine', specialization: 'Internal Medicine', phone: '555-111-2222', email: 'sarah@hospital.com' },
          { id: 2, name: 'Dr. Michael Brown', role: 'Doctor', department: 'Cardiology', specialization: 'Interventional Cardiology', phone: '555-333-4444', email: 'michael@hospital.com' },
          { id: 3, name: 'Nurse Emily Davis', role: 'Nurse', department: 'General Medicine', specialization: 'General Nursing', phone: '555-555-6666', email: 'emily@hospital.com' },
          { id: 4, name: 'Nurse Robert Johnson', role: 'Nurse', department: 'Emergency', specialization: 'Emergency Care', phone: '555-777-8888', email: 'robert@hospital.com' }
        ];
        
        // Mock appointments data
        const mockAppointments = [
          { id: 1, patient_name: 'Alice Thompson', doctor_name: 'Dr. Sarah Wilson', department: 'General Medicine', date: '2023-06-20T10:00:00Z', status: 'scheduled' },
          { id: 2, patient_name: 'Bob Anderson', doctor_name: 'Dr. Michael Brown', department: 'Cardiology', date: '2023-06-20T11:30:00Z', status: 'scheduled' },
          { id: 3, patient_name: 'Carol Martinez', doctor_name: 'Dr. Sarah Wilson', department: 'General Medicine', date: '2023-06-19T14:00:00Z', status: 'completed' },
          { id: 4, patient_name: 'David Wilson', doctor_name: 'Dr. Michael Brown', department: 'Cardiology', date: '2023-06-19T15:30:00Z', status: 'cancelled' }
        ];
        
        setPatients(mockPatients);
        setStaff(mockStaff);
        setAppointments(mockAppointments);
        setLoading(false);
      }, 1000);
    };

    // Use the simulation for demo
    simulateApiResponses();
    
    // In a real application, you would use:
    // fetchHospitalData();
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
    patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.doctor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStaff = staff.filter(member => 
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAppointments = appointments.filter(appointment => 
    appointment.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appointment.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appointment.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!userProfile || userProfile.user_type !== 'hospital') {
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
        <h2 className="mb-4">Hospital Dashboard</h2>
        
        {error && (
          <Alert variant="danger">
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
          </Alert>
        )}
        
        <Row className="mb-4">
          <Col md={3} className="mb-3">
            <Card className="shadow-sm h-100 bg-primary text-white">
              <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                <div className="display-4 mb-2">{patients.filter(p => p.status === 'admitted').length}</div>
                <div className="text-center">
                  <i className="fas fa-procedures me-2"></i>
                  Admitted Patients
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} className="mb-3">
            <Card className="shadow-sm h-100 bg-success text-white">
              <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                <div className="display-4 mb-2">{staff.length}</div>
                <div className="text-center">
                  <i className="fas fa-user-md me-2"></i>
                  Medical Staff
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} className="mb-3">
            <Card className="shadow-sm h-100 bg-warning text-white">
              <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                <div className="display-4 mb-2">
                  {appointments.filter(a => a.status === 'scheduled').length}
                </div>
                <div className="text-center">
                  <i className="fas fa-calendar-check me-2"></i>
                  Upcoming Appointments
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} className="mb-3">
            <Card className="shadow-sm h-100 bg-info text-white">
              <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                <div className="display-4 mb-2">
                  {patients.filter(p => p.status === 'discharged').length}
                </div>
                <div className="text-center">
                  <i className="fas fa-walking me-2"></i>
                  Discharged Patients
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        <Card className="shadow-sm">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="mb-0">Hospital Management</h4>
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
                <p className="mt-3">Loading hospital data...</p>
              </div>
            ) : (
              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-3"
              >
                <Tab eventKey="patients" title="Patients">
                  {filteredPatients.length === 0 ? (
                    <Alert variant="info">
                      <i className="fas fa-info-circle me-2"></i>
                      No patients found.
                    </Alert>
                  ) : (
                    <Table responsive striped hover>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Age/Gender</th>
                          <th>Department</th>
                          <th>Doctor</th>
                          <th>Diagnosis</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPatients.map(patient => (
                          <tr key={patient.id}>
                            <td>{patient.name}</td>
                            <td>{patient.age} / {patient.gender}</td>
                            <td>{patient.department}</td>
                            <td>{patient.doctor}</td>
                            <td>{patient.diagnosis}</td>
                            <td>
                            <Badge bg={patient.status === 'admitted' ? 'primary' : 'success'}>
                                {patient.status === 'admitted' ? 'Admitted' : 'Discharged'}
                              </Badge>
                            </td>
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
                </Tab>
                <Tab eventKey="staff" title="Medical Staff">
                  {filteredStaff.length === 0 ? (
                    <Alert variant="info">
                      <i className="fas fa-info-circle me-2"></i>
                      No staff members found.
                    </Alert>
                  ) : (
                    <Table responsive striped hover>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Role</th>
                          <th>Department</th>
                          <th>Specialization</th>
                          <th>Contact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStaff.map(member => (
                          <tr key={member.id}>
                            <td>{member.name}</td>
                            <td>{member.role}</td>
                            <td>{member.department}</td>
                            <td>{member.specialization}</td>
                            <td>
                              <div>{member.phone}</div>
                              <div>{member.email}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Tab>
                <Tab eventKey="appointments" title="Appointments">
                  {filteredAppointments.length === 0 ? (
                    <Alert variant="info">
                      <i className="fas fa-info-circle me-2"></i>
                      No appointments found.
                    </Alert>
                  ) : (
                    <Table responsive striped hover>
                      <thead>
                        <tr>
                          <th>Patient</th>
                          <th>Doctor</th>
                          <th>Department</th>
                          <th>Date & Time</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAppointments.map(appointment => (
                          <tr key={appointment.id}>
                            <td>{appointment.patient_name}</td>
                            <td>{appointment.doctor_name}</td>
                            <td>{appointment.department}</td>
                            <td>{new Date(appointment.date).toLocaleString()}</td>
                            <td>
                              <Badge bg={
                                appointment.status === 'scheduled' ? 'primary' : 
                                appointment.status === 'completed' ? 'success' : 'danger'
                              }>
                                {appointment.status === 'scheduled' ? 'Scheduled' : 
                                 appointment.status === 'completed' ? 'Completed' : 'Cancelled'}
                              </Badge>
                            </td>
                            <td>
                              {appointment.status === 'scheduled' && (
                                <>
                                  <Button variant="outline-success" size="sm" className="me-2">
                                    <i className="fas fa-check me-1"></i>
                                    Complete
                                  </Button>
                                  <Button variant="outline-danger" size="sm">
                                    <i className="fas fa-times me-1"></i>
                                    Cancel
                                  </Button>
                                </>
                              )}
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
                    <p className="text-muted mb-0">{selectedPatient.address}</p>
                  </Col>
                  <Col md={6} className="text-md-end">
                    <p className="mb-0"><strong>Age:</strong> {selectedPatient.age}</p>
                    <p className="mb-0"><strong>Gender:</strong> {selectedPatient.gender}</p>
                    <p className="mb-0"><strong>Blood Type:</strong> {selectedPatient.blood_type}</p>
                    <p className="mb-0">
                      <strong>Status:</strong> 
                      <Badge bg={selectedPatient.status === 'admitted' ? 'primary' : 'success'} className="ms-2">
                        {selectedPatient.status === 'admitted' ? 'Admitted' : 'Discharged'}
                      </Badge>
                    </p>
                  </Col>
                </Row>
                
                <h6 className="mb-3">Medical Information</h6>
                <Row className="mb-4">
                  <Col md={6}>
                    <p className="mb-1"><strong>Department:</strong> {selectedPatient.department}</p>
                    <p className="mb-1"><strong>Doctor:</strong> {selectedPatient.doctor}</p>
                    <p className="mb-1"><strong>Diagnosis:</strong> {selectedPatient.diagnosis}</p>
                  </Col>
                  <Col md={6}>
                    <p className="mb-1"><strong>Admission Date:</strong> {new Date(selectedPatient.admission_date).toLocaleDateString()}</p>
                    {selectedPatient.discharge_date && (
                      <p className="mb-1"><strong>Discharge Date:</strong> {new Date(selectedPatient.discharge_date).toLocaleDateString()}</p>
                    )}
                  </Col>
                </Row>
                
                <div className="d-flex justify-content-between">
                  <Button variant="outline-primary">
                    <i className="fas fa-file-medical me-1"></i>
                    Medical Records
                  </Button>
                  <Button variant="outline-info">
                    <i className="fas fa-notes-medical me-1"></i>
                    Treatment Plan
                  </Button>
                  <Button variant="outline-warning">
                    <i className="fas fa-pills me-1"></i>
                    Medications
                  </Button>
                </div>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClosePatientModal}>
              Close
            </Button>
            {selectedPatient && selectedPatient.status === 'admitted' && (
              <Button variant="success">
                <i className="fas fa-walking me-1"></i>
                Discharge Patient
              </Button>
            )}
          </Modal.Footer>
        </Modal>
      </Container>
      <Footer />
    </>
  );
};

export default HospitalDashboard;
