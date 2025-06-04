import os
import pandas as pd
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain.schema import Document # A LangChain schema for organizing text data with metadata.
from django.conf import settings
from dotenv import load_dotenv, find_dotenv

def load_env():
    _ = load_dotenv(find_dotenv())

def get_gemini_api_key():
    load_env()
    return os.getenv("GEMINI_API_KEY")

gemini_api_key = get_gemini_api_key()

# Class that manages the vector database logic
class MedicalKnowledgeDB:
    def __init__(self):
        self.data_dir = settings.DATA_DIR  # Points to the folder holding the CSV files.
        self.db_path = os.path.join(settings.BASE_DIR, 'diagnostics', 'agents', 'vector_db')  # Where the FAISS index will be saved.
        
        # Set up Gemini embeddings to convert text to vectors.
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=gemini_api_key
        )
        self.vector_db = None
    
    def load_or_create_db(self):
        """Load existing vector DB or create a new one if it doesn't exist"""
        if os.path.exists(self.db_path) and os.path.isdir(self.db_path):
            print("Loading existing vector database...")
            self.vector_db = FAISS.load_local(
                self.db_path, 
                self.embeddings,
                allow_dangerous_deserialization=True  
            )
            return self.vector_db
        
        print("Creating new vector database...")
        return self.create_db()
    
    def create_db(self):
        """Create a vector database from medical datasets"""
        documents = []
        
        # Load disease descriptions
        symptoms_dir = os.path.join(self.data_dir, 'symptoms')
        df_description = pd.read_csv(os.path.join(symptoms_dir, 'symptom_Description.csv'))
        
        # Add disease descriptions to documents
        for _, row in df_description.iterrows():
            doc = Document(
                page_content=f"Disease: {row['Disease']}\nDescription: {row['Description']}",
                metadata={"source": "description", "disease": row['Disease']}
            )
            documents.append(doc)
        
        # Load symptom-disease relationships
        dataset = pd.read_csv(os.path.join(symptoms_dir, 'dataset.csv'))
        
        # Process each disease and its symptoms
        for _, row in dataset.iterrows():
            disease = row['Disease']
            symptoms = [str(row[col]).strip() for col in dataset.columns[1:] if pd.notna(row[col])]
            symptoms_text = ", ".join([s for s in symptoms if s])
            
            doc = Document(
                page_content=f"Disease: {disease}\nSymptoms: {symptoms_text}",
                metadata={"source": "dataset", "disease": disease}
            )
            documents.append(doc)
        
        # Load precautions
        df_precaution = pd.read_csv(os.path.join(symptoms_dir, 'symptom_precaution.csv'))
        
        # Add precautions to documents
        for _, row in df_precaution.iterrows():
            precautions = [row[f'Precaution_{i}'] for i in range(1, 5) if pd.notna(row[f'Precaution_{i}'])]
            precautions_text = ", ".join(precautions)
            
            doc = Document(
                page_content=f"Disease: {row['Disease']}\nPrecautions: {precautions_text}",
                metadata={"source": "precaution", "disease": row['Disease']}
            )
            documents.append(doc)
        
        # Create vector store
        self.vector_db = FAISS.from_documents(documents, self.embeddings)
        
        # Save to disk
        os.makedirs(self.db_path, exist_ok=True)
        self.vector_db.save_local(self.db_path)
        
        return self.vector_db
    
    def search(self, query, k=5):
        """Search the vector database for relevant information"""
        if not self.vector_db:
            self.load_or_create_db()
        
        return self.vector_db.similarity_search(query, k=k) # Given a query, it finds top k relevant documents from the DB. These enable agents to retrieve context when thinking about predictions.
