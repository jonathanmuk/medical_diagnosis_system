import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Row, Col, Card, Spinner, Image, Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import diagnosticService from '../../services/diagnosticService';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const MalariaDetection = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Check if user is authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/malaria-detection' } });
    }
  }, [isAuthenticated, navigate]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!selectedFile) {
      setError('Please select an image to upload');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await diagnosticService.predictMalaria(selectedFile);
      setResult(result);
    } catch (error) {
      console.error('Error details:', error);
      setError(error.response?.data?.error || 'Error processing image. Please try again with a different image.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <Container className="py-5">
        <Row>
          <Col lg={8} className="mx-auto">
            <Card className="shadow-sm">
              <Card.Body>
                <h3 className="text-primary mb-4">
                  <i className="fas fa-microscope me-2"></i>
                  Malaria Parasite Detection
                </h3>
                
                <Alert variant="info" className="d-flex align-items-start mb-4">
                  <i className="fas fa-info-circle me-3 mt-1 fa-lg"></i>
                  <div>
                    <strong>Upload a blood smear image</strong> to detect the presence of malaria parasites.
                    <div className="mt-2 p-2 bg-light border-start border-info border-4 rounded">
                      <strong>For best results:</strong> Use clear microscopic images of thin or thick blood smears.
                      The image should be well-focused and properly stained.
                    </div>
                  </div>
                </Alert>
                
                {error && (
                  <Alert variant="danger">
                    <i className="fas fa-exclamation-circle me-2"></i>
                    {error}
                  </Alert>
                )}
                
                <Form onSubmit={handleSubmit}>
                  <Card className="bg-light mb-4">
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          <strong>Upload Blood Smear Image</strong>
                        </Form.Label>
                        <div className="input-group">
                          <Form.Control
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={loading}
                            className="form-control"
                          />
                        </div>
                        <Form.Text className="text-muted">
                          Supported formats: JPG, PNG, JPEG
                        </Form.Text>
                      </Form.Group>
                      
                      {previewUrl && (
                        <div className="text-center mt-4">
                          <p className="mb-2"><strong>Image Preview:</strong></p>
                          <div className="d-inline-block border p-2 bg-white">
                            <Image
                              src={previewUrl}
                              alt="Preview"
                              thumbnail
                              style={{ maxHeight: '250px', maxWidth: '100%' }}
                            />
                          </div>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                  
                  <div className="d-grid gap-2">
                    <Button
                      variant="primary"
                      type="submit"
                      size="lg"
                      disabled={!selectedFile || loading}
                      className="py-2"
                    >
                      {loading ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                          />
                          Processing...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-search me-2"></i>
                          Detect Malaria
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
                
                {result && (
                  <Row className="mt-4">
                    <Col>
                      <Card className={`border-${result.is_infected ? 'danger' : 'success'}`}>
                        <Card.Header className={`bg-${result.is_infected ? 'danger' : 'success'} text-white`}>
                          <h5 className="mb-0">
                            <i className={`fas fa-${result.is_infected ? 'virus' : 'check-circle'} me-2`}></i>
                            Detection Result
                          </h5>
                        </Card.Header>
                        <Card.Body>
                          <h4 className={`text-${result.is_infected ? 'danger' : 'success'}`}>
                            {result.message}
                          </h4>
                          <p>
                            <strong>Confidence:</strong> {(result.confidence * 100).toFixed(2)}%
                          </p>
                          <div className="mt-3">
                            {result.is_infected ? (
                              <Alert variant="warning">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                Please consult a healthcare professional immediately for confirmation and treatment.
                              </Alert>
                            ) : (
                              <Alert variant="info">
                                <i className="fas fa-info-circle me-2"></i>
                                No malaria parasites detected. If symptoms persist, please consult a healthcare professional.
                              </Alert>
                            )}
                          </div>
                          {result.saved && (
                            <Alert variant="success" className="mt-2">
                              <i className="fas fa-save me-2"></i>
                              This result has been saved to your health records.
                            </Alert>
                          )}
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
      <Footer />
    </>
  );
};

export default MalariaDetection;
