const chai = require('chai');
const chaiHttp = require('chai-http');
const fs = require('fs');
const path = require('path');
const expect = chai.expect;

const app = require('../src/server');
const { Document, AnalysisResult, Signature } = require('../src/models');

chai.use(chaiHttp);

describe('Document Processing API', () => {
  // Test file paths
  const testFilePath = path.join(__dirname, 'fixtures/test-document.pdf');
  const testFile2Path = path.join(__dirname, 'fixtures/test-document-2.pdf');
  
  before(async () => {
    // Create test files if they don't exist
    if (!fs.existsSync(path.join(__dirname, 'fixtures'))) {
      fs.mkdirSync(path.join(__dirname, 'fixtures'));
    }
    
    // Create dummy PDF files for testing
    if (!fs.existsSync(testFilePath)) {
      fs.writeFileSync(testFilePath, 'Test PDF content');
    }
    if (!fs.existsSync(testFile2Path)) {
      fs.writeFileSync(testFile2Path, 'Test PDF content 2');
    }
  });

  after(async () => {
    // Cleanup test files
    try {
      fs.unlinkSync(testFilePath);
      fs.unlinkSync(testFile2Path);
      fs.rmdirSync(path.join(__dirname, 'fixtures'));
    } catch (error) {
      console.error('Error cleaning up test files:', error);
    }
  });

  describe('Document Upload', () => {
    it('should upload a document successfully', (done) => {
      chai.request(app)
        .post('/api/test/upload-document')
        .attach('document', testFilePath)
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('file');
          expect(res.body.file).to.have.property('id');
          done();
        });
    });

    it('should reject upload without a file', (done) => {
      chai.request(app)
        .post('/api/test/upload-document')
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('success', false);
          done();
        });
    });
  });

  describe('Document Comparison', () => {
    it('should compare two documents', (done) => {
      chai.request(app)
        .post('/api/test/compare-documents')
        .attach('document1', testFilePath)
        .attach('document2', testFile2Path)
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('comparisonResults');
          expect(res.body.comparisonResults).to.have.property('differences');
          done();
        });
    });

    it('should reject comparison without two files', (done) => {
      chai.request(app)
        .post('/api/test/compare-documents')
        .attach('document1', testFilePath)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('success', false);
          done();
        });
    });
  });

  describe('Document Analysis', () => {
    let documentId;

    before(async () => {
      // Create a test document
      const doc = await Document.create({
        name: 'test-document.pdf',
        filePath: testFilePath,
        fileType: 'application/pdf',
        fileSize: 100,
        status: 'active',
        uploadedBy: '00000000-0000-4000-a000-000000000000'
      });
      documentId = doc.id;
    });

    it('should start document analysis', (done) => {
      chai.request(app)
        .post(`/api/test/analyze-document/${documentId}`)
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('analysis');
          expect(res.body.analysis).to.have.property('status', 'processing');
          done();
        });
    });

    it('should get analysis results', (done) => {
      // First create an analysis result
      AnalysisResult.create({
        id: '12345678-1234-5678-1234-567812345678',
        documentId: documentId,
        status: 'completed',
        entities: [{ type: 'person', name: 'John Doe', occurrences: 1 }],
        clauses: [{ type: 'liability', text: 'Sample clause' }],
        risks: [{ level: 'high', description: 'Test risk' }],
        summary: 'Test summary'
      }).then(() => {
        chai.request(app)
          .get('/api/test/analysis-results/12345678-1234-5678-1234-567812345678')
          .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res.body).to.have.property('success', true);
            expect(res.body).to.have.property('analysis');
            expect(res.body.analysis).to.have.property('status', 'completed');
            done();
          });
      });
    });
  });

  describe('Document Signing', () => {
    let documentId;

    before(async () => {
      // Create a test document
      const doc = await Document.create({
        name: 'test-document.pdf',
        filePath: testFilePath,
        fileType: 'application/pdf',
        fileSize: 100,
        status: 'active',
        uploadedBy: '00000000-0000-4000-a000-000000000000'
      });
      documentId = doc.id;
    });

    it('should add a signature to a document', (done) => {
      const signatureData = {
        signatureType: 'drawn',
        signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
        position: {
          page: 1,
          x: 100,
          y: 100,
          width: 200,
          height: 50
        }
      };

      chai.request(app)
        .post(`/api/test/sign-document/${documentId}`)
        .send(signatureData)
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('signature');
          expect(res.body.signature).to.have.property('documentId', documentId);
          done();
        });
    });

    it('should reject invalid signature data', (done) => {
      chai.request(app)
        .post(`/api/test/sign-document/${documentId}`)
        .send({})
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('success', false);
          done();
        });
    });
  });

  describe('Report Generation', () => {
    let documentId;

    before(async () => {
      // Create a test document with analysis
      const doc = await Document.create({
        name: 'test-document.pdf',
        filePath: testFilePath,
        fileType: 'application/pdf',
        fileSize: 100,
        status: 'active',
        uploadedBy: '00000000-0000-4000-a000-000000000000'
      });
      documentId = doc.id;

      await AnalysisResult.create({
        documentId: doc.id,
        status: 'completed',
        entities: [{ type: 'person', name: 'John Doe', occurrences: 1 }],
        clauses: [{ type: 'liability', text: 'Sample clause' }],
        risks: [{ level: 'high', description: 'Test risk' }],
        summary: 'Test summary'
      });
    });

    it('should generate a report for a document', (done) => {
      chai.request(app)
        .post(`/api/test/generate-report/${documentId}`)
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('report');
          expect(res.body.report).to.have.property('title');
          expect(res.body.report).to.have.property('content');
          done();
        });
    });

    it('should handle report generation for non-existent document', (done) => {
      chai.request(app)
        .post('/api/test/generate-report/00000000-0000-0000-0000-000000000000')
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body).to.have.property('success', false);
          done();
        });
    });
  });
}); 