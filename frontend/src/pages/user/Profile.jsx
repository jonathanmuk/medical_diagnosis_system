import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';

const ProfileSchema = Yup.object().shape({
  username: Yup.string()
    .min(3, 'Username must be at least 3 characters')
    .required('Username is required'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  phone_number: Yup.string(),
  address: Yup.string(),
  date_of_birth: Yup.date()
});

const Profile = () => {
  const { userProfile, updateProfile } = useAuth();
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  if (!userProfile) {
    return (
      <>
        <Header />
        <Container className="py-5">
          <Alert variant="info">Loading profile information...</Alert>
        </Container>
        <Footer />
      </>
    );
  }

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setUpdateError(null);
      setUpdateSuccess(false);
      
      const success = await updateProfile(values);
      
      if (success) {
        setUpdateSuccess(true);
        window.scrollTo(0, 0);
      } else {
        setUpdateError('Failed to update profile');
      }
    } catch (error) {
      setUpdateError(error.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <Container className="py-5">
        <Row>
          <Col lg={4} className="mb-4">
            <Card className="shadow-sm">
              <Card.Body className="text-center">
                <div className="mb-3">
                  <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto" style={{ width: '100px', height: '100px' }}>
                    <i className="fas fa-user fa-3x"></i>
                  </div>
                </div>
                <h4>{userProfile.username}</h4>
                <p className="text-muted">{userProfile.email}</p>
                <p className="mb-1">
                  <i className="fas fa-user-tag me-2"></i>
                  {userProfile.user_type === 'user' ? 'Regular User' : 
                   userProfile.user_type === 'health_worker' ? 'Health Worker' :
                   userProfile.user_type === 'pharmacy' ? 'Pharmacy' :
                   userProfile.user_type === 'hospital' ? 'Hospital' : 'Unknown'}
                </p>
                {userProfile.phone_number && (
                  <p className="mb-1">
                    <i className="fas fa-phone me-2"></i>
                    {userProfile.phone_number}
                  </p>
                )}
                <p className="mb-1">
                  <i className="fas fa-calendar me-2"></i>
                  Member since: {new Date(userProfile.date_joined).toLocaleDateString()}
                </p>
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={8}>
            <Card className="shadow-sm">
              <Card.Body>
                <h4 className="mb-4">Edit Profile</h4>
                
                {updateSuccess && (
                  <Alert variant="success">
                    <i className="fas fa-check-circle me-2"></i>
                    Profile updated successfully!
                  </Alert>
                )}
                
                {updateError && (
                  <Alert variant="danger">
                    <i className="fas fa-exclamation-circle me-2"></i>
                    {updateError}
                  </Alert>
                )}
                
                <Formik
                  initialValues={{
                    username: userProfile.username || '',
                    email: userProfile.email || '',
                    phone_number: userProfile.phone_number || '',
                    address: userProfile.address || '',
                    date_of_birth: userProfile.date_of_birth ? userProfile.date_of_birth.split('T')[0] : ''
                  }}
                  validationSchema={ProfileSchema}
                  onSubmit={handleSubmit}
                >
                  {({
                    values,
                    errors,
                    touched,
                    handleChange,
                    handleBlur,
                    handleSubmit,
                    isSubmitting,
                  }) => (
                    <Form onSubmit={handleSubmit}>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Username</Form.Label>
                            <Form.Control
                              type="text"
                              name="username"
                              value={values.username}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              isInvalid={touched.username && errors.username}
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.username}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                              type="email"
                              name="email"
                              value={values.email}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              isInvalid={touched.email && errors.email}
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.email}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Phone Number</Form.Label>
                            <Form.Control
                              type="text"
                              name="phone_number"
                              value={values.phone_number}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              isInvalid={touched.phone_number && errors.phone_number}
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.phone_number}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Date of Birth</Form.Label>
                            <Form.Control
                              type="date"
                              name="date_of_birth"
                              value={values.date_of_birth}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              isInvalid={touched.date_of_birth && errors.date_of_birth}
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.date_of_birth}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Address</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          name="address"
                          value={values.address}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.address && errors.address}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.address}
                        </Form.Control.Feedback>
                      </Form.Group>
                      
                      {/* Render additional fields based on user type */}
                      {userProfile.user_type === 'health_worker' && (
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Qualification</Form.Label>
                              <Form.Control
                                type="text"
                                name="qualification"
                                value={values.qualification || userProfile.qualification || ''}
                                onChange={handleChange}
                                onBlur={handleBlur}
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Specialization</Form.Label>
                              <Form.Control
                                type="text"
                                name="specialization"
                                value={values.specialization || userProfile.specialization || ''}
                                onChange={handleChange}
                                onBlur={handleBlur}
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                      )}
                      
                      {(userProfile.user_type === 'pharmacy' || userProfile.user_type === 'hospital') && (
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Organization Name</Form.Label>
                              <Form.Control
                                type="text"
                                name="organization_name"
                                value={values.organization_name || userProfile.organization_name || ''}
                                onChange={handleChange}
                                onBlur={handleBlur}
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>License Number</Form.Label>
                              <Form.Control
                                type="text"
                                name="license_number"
                                value={values.license_number || userProfile.license_number || ''}
                                onChange={handleChange}
                                onBlur={handleBlur}
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                      )}
                      
                      <Button
                        variant="primary"
                        type="submit"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </Form>
                  )}
                </Formik>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
      <Footer />
    </>
  );
};

export default Profile;
