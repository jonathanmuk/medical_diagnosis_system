import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, InputGroup } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { Formik } from 'formik';
import * as Yup from 'yup';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const RegisterSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required'),
  first_name: Yup.string()
    .required('First name is required'),
  last_name: Yup.string()
    .required('Last name is required'),
  gender: Yup.string()
    .required('Gender is required'),
  date_of_birth: Yup.date()
    .required('Date of birth is required')
    .max(new Date(), 'Date of birth cannot be in the future'),
  district: Yup.string()
    .required('District is required'),
  subcounty: Yup.string()
    .required('Sub-county is required'),
  village: Yup.string()
    .required('Village is required'),
  phone_number: Yup.string()
    .required('Phone number is required'),
  userType: Yup.string()
    .required('User type is required'),
  qualification: Yup.string()
    .when('userType', {
      is: 'health_worker',
      then: Yup.string().required('Qualification is required')
    }),
  specialization: Yup.string()
    .when('userType', {
      is: 'health_worker',
      then: Yup.string().required('Specialization is required')
    })
});

const RegisterPage = () => {
  const { register } = useAuth();
  const [registerError, setRegisterError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  
  const [districts, setDistricts] = useState([]);
  const [subcounties, setSubcounties] = useState([]);
  const [villages, setVillages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching locations...');
        // Use the correct endpoint
        const response = await api.get('/auth/locations/');
        console.log('Locations API response:', response.data);
        
        if (response.data && response.data.districts) {
          setDistricts(response.data.districts);
          console.log('Districts set:', response.data.districts);
        } else {
          console.error('No districts in response:', response.data);
          setDistricts([]);
        }
        setLoadError(null);
      } catch (error) {
        console.error('Error fetching locations:', error);
        setLoadError(`Failed to load location data: ${error.message}`);
        setDistricts([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLocations();
  }, []);

  // Add the missing handleDistrictChange function
  const handleDistrictChange = (e, setFieldValue) => {
    const districtName = e.target.value;
    setFieldValue('district', districtName);
    setFieldValue('subcounty', '');
    setFieldValue('village', '');
    
    const district = districts.find(d => d.name === districtName);
    if (district) {
      setSubcounties(district.subcounties || []);
      setVillages([]);
    } else {
      setSubcounties([]);
      setVillages([]);
    }
  };

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      setRegisterError(null);
          
      // Remove confirmPassword as it's not needed for the API
      const { confirmPassword, ...userData } = values;
          
      // Create a username from first and last name
      userData.username = `${values.first_name.toLowerCase()}_${values.last_name.toLowerCase()}`;
          
      // Format address
      userData.address = `${values.village}, ${values.subcounty}, ${values.district}`;
          
      // Register and automatically log in the user
      await register(userData);
      setSuccess(true);
      resetForm();
          
      // Show success message briefly, then redirect to homepage
      setTimeout(() => {
        navigate('/');  // Redirect to homepage instead of login
      }, 1500);
    } catch (error) {
      setRegisterError(error.response?.data?.error || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={10}>
            <Card className="shadow">
              <Card.Body className="p-4">
                <h2 className="text-center mb-4">Create Your Account</h2>
                
                {registerError && (
                  <Alert variant="danger">{registerError}</Alert>
                )}
                
                {success && (
                  <Alert variant="success">
                    Registration successful! Redirecting to homepage...
                  </Alert>
                )}
                
                {isLoading && (
                  <Alert variant="info">
                    Loading location data...
                  </Alert>
                )}

                {loadError && (
                  <Alert variant="danger">
                    {loadError}
                  </Alert>
                )}
                
                <Formik
                  initialValues={{
                    email: '',
                    password: '',
                    confirmPassword: '',
                    first_name: '',
                    middle_name: '',
                    last_name: '',
                    gender: '',
                    date_of_birth: '',
                    district: '',
                    subcounty: '',
                    village: '',
                    phone_number: '',
                    userType: 'user',
                    qualification: '',
                    specialization: ''
                  }}
                  validationSchema={RegisterSchema}
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
                    setFieldValue
                  }) => (
                    <Form onSubmit={handleSubmit}>
                      <h5 className="mb-3">Account Information</h5>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Email Address</Form.Label>
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
                        
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>User Type</Form.Label>
                            <Form.Select
                              name="userType"
                              value={values.userType}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              isInvalid={touched.userType && errors.userType}
                            >
                              <option value="user">Regular User</option>
                              <option value="health_worker">Health Worker</option>
                            </Form.Select>
                            <Form.Text className="text-muted">
                              Hospitals and pharmacies can only be registered by administrators.
                            </Form.Text>
                            <Form.Control.Feedback type="invalid">
                              {errors.userType}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Password</Form.Label>
                            <Form.Control
                              type="password"
                              name="password"
                              value={values.password}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              isInvalid={touched.password && errors.password}
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.password}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Confirm Password</Form.Label>
                            <Form.Control
                              type="password"
                              name="confirmPassword"
                              value={values.confirmPassword}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              isInvalid={touched.confirmPassword && errors.confirmPassword}
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.confirmPassword}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <hr className="my-4" />
                      <h5 className="mb-3">Personal Information</h5>
                      
                      <Row>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>First Name</Form.Label>
                            <Form.Control
                              type="text"
                              name="first_name"
                              value={values.first_name}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              isInvalid={touched.first_name && errors.first_name}
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.first_name}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Middle Name (Optional)</Form.Label>
                            <Form.Control
                              type="text"
                              name="middle_name"
                              value={values.middle_name}
                              onChange={handleChange}
                              onBlur={handleBlur}
                            />
                          </Form.Group>
                        </Col>
                        
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Last Name</Form.Label>
                            <Form.Control
                              type="text"
                              name="last_name"
                              value={values.last_name}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              isInvalid={touched.last_name && errors.last_name}
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.last_name}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Gender</Form.Label>
                            <Form.Select
                              name="gender"
                              value={values.gender}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              isInvalid={touched.gender && errors.gender}
                            >
                              <option value="">Select Gender</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                            </Form.Select>
                            <Form.Control.Feedback type="invalid">
                              {errors.gender}
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
                      
                      <Row>
                        <Col md={12}>
                          <Form.Group className="mb-3">
                            <Form.Label>Phone Number</Form.Label>
                            <PhoneInput
                              country={'ug'}
                              value={values.phone_number}
                              onChange={(phone) => setFieldValue('phone_number', phone)}
                              inputProps={{
                                name: 'phone_number',
                                required: true,
                                onBlur: handleBlur,
                              }}
                              containerClass={touched.phone_number && errors.phone_number ? 'is-invalid' : ''}
                              inputClass={touched.phone_number && errors.phone_number ? 'form-control is-invalid' : 'form-control'}
                            />
                            {touched.phone_number && errors.phone_number && (
                              <div className="invalid-feedback d-block">
                                {errors.phone_number}
                              </div>
                            )}
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <hr className="my-4" />
                      <h5 className="mb-3">Location Information</h5>
                      
                      <Row>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>District</Form.Label>
                            <Form.Select
                              name="district"
                              value={values.district}
                              onChange={(e) => handleDistrictChange(e, setFieldValue)}
                              onBlur={handleBlur}
                              isInvalid={touched.district && errors.district}
                              disabled={isLoading}
                            >
                              <option value="">Select District</option>
                              {districts && districts.map(district => (
                                <option key={district.id} value={district.name}>
                                  {district.name}
                                </option>
                              ))}
                            </Form.Select>
                            <Form.Control.Feedback type="invalid">
                              {errors.district}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Sub-County</Form.Label>
                            <Form.Select
                              name="subcounty"
                              value={values.subcounty}
                              onChange={(e) => {
                                const subcountyName = e.target.value;
                                setFieldValue('subcounty', subcountyName);
                                setFieldValue('village', '');
                                
                                const district = districts.find(d => d.name === values.district);
                                if (district) {
                                  const subcounty = district.subcounties.find(s => s.name === subcountyName);
                                  if (subcounty) {
                                    setVillages(subcounty.villages || []);
                                  } else {
                                    setVillages([]);
                                  }
                                }
                              }}
                              onBlur={handleBlur}
                              isInvalid={touched.subcounty && errors.subcounty}
                              disabled={!values.district}
                            >
                              <option value="">Select Sub-County</option>
                              {subcounties && subcounties.map(subcounty => (
                                <option key={subcounty.id} value={subcounty.name}>
                                  {subcounty.name}
                                </option>
                              ))}
                            </Form.Select>
                            <Form.Control.Feedback type="invalid">
                              {errors.subcounty}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Village</Form.Label>
                            <Form.Select
                              name="village"
                              value={values.village}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              isInvalid={touched.village && errors.village}
                              disabled={!values.subcounty}
                            >
                              <option value="">Select Village</option>
                              {villages && villages.map((village, index) => (
                                <option key={index} value={village}>
                                  {village}
                                </option>
                              ))}
                            </Form.Select>
                            <Form.Control.Feedback type="invalid">
                              {errors.village}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      {/* Conditional fields for health workers */}
                      {values.userType === 'health_worker' && (
                        <>
                          <hr className="my-4" />
                          <h5 className="mb-3">Professional Information</h5>
                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Qualification</Form.Label>
                                <Form.Control
                                  type="text"
                                  name="qualification"
                                  value={values.qualification}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  isInvalid={touched.qualification && errors.qualification}
                                  placeholder="e.g., MBBS, MD, Nursing Degree"
                                />
                                <Form.Control.Feedback type="invalid">
                                  {errors.qualification}
                                </Form.Control.Feedback>
                              </Form.Group>
                            </Col>
                            
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Specialization</Form.Label>
                                <Form.Control
                                  type="text"
                                  name="specialization"
                                  value={values.specialization}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  isInvalid={touched.specialization && errors.specialization}
                                  placeholder="e.g., Cardiology, Pediatrics, General Practice"
                                />
                                <Form.Control.Feedback type="invalid">
                                  {errors.specialization}
                                </Form.Control.Feedback>
                              </Form.Group>
                            </Col>
                          </Row>
                        </>
                      )}
                      
                      <div className="d-grid gap-2 mt-4">
                        <Button
                          variant="primary"
                          type="submit"
                          size="lg"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Creating Account...' : 'Create Account'}
                        </Button>
                      </div>
                    </Form>
                  )}
                </Formik>
                
                <div className="text-center mt-4">
                  <p>
                    Already have an account? <Link to="/login" className="fw-bold">Login</Link>
                  </p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
      <Footer />
    </>
  );
};

export default RegisterPage;
