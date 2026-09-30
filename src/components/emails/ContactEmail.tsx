import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Img,
  Row,
  Column,
} from '@react-email/components';


interface ContactEmailProps {
  nombres: string;
  apellido: string;
  email: string;
  celular: string;
  documentType: string;
  documentNumber: string;
  contactPreference: string;
  horario: string;
  project: string;
  mensaje?: string;
}

export const ContactEmail = ({
  nombres,
  apellido,
  email,
  celular,
  documentType,
  documentNumber,
  contactPreference,
  horario,
  project,
  mensaje,
}: ContactEmailProps) => (
  <Html>
    <Head />
    <Preview>Nuevo mensaje de contacto de {nombres} {apellido}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
            <Text style={logo}>MAR DE JAVA</Text>
        </Section>
        
        <Section style={content}>
          <Heading style={h1}>Nueva Solicitud de Información</Heading>
          <Text style={text}>
            Se ha recibido un nuevo mensaje a través del formulario de contacto del proyecto <strong>{project}</strong>.
          </Text>
          
          <Hr style={hr} />
          
          <Section style={detailsSection}>
            <Text style={sectionTitle}>Información del Cliente</Text>
            
            <Row style={row}>
              <Column style={columnLabel}>Nombre:</Column>
              <Column style={columnValue}>{nombres} {apellido}</Column>
            </Row>
            
            <Row style={row}>
              <Column style={columnLabel}>Documento:</Column>
              <Column style={columnValue}>{documentType}: {documentNumber}</Column>
            </Row>
            
            <Row style={row}>
              <Column style={columnLabel}>Email:</Column>
              <Column style={columnValue}>{email}</Column>
            </Row>
            
            <Row style={row}>
              <Column style={columnLabel}>Celular:</Column>
              <Column style={columnValue}>{celular || 'No proporcionado'}</Column>
            </Row>
          </Section>

          <Hr style={hr} />

          <Section style={detailsSection}>
            <Text style={sectionTitle}>Preferencia de Contacto</Text>
            
            <Row style={row}>
              <Column style={columnLabel}>Medio:</Column>
              <Column style={columnValue}>{contactPreference}</Column>
            </Row>
            
            <Row style={row}>
              <Column style={columnLabel}>Horario:</Column>
              <Column style={columnValue}>{horario}</Column>
            </Row>
          </Section>

          <Hr style={hr} />

          <Section style={detailsSection}>
            <Text style={sectionTitle}>Mensaje / Comentarios</Text>
            <Text style={text}>{mensaje || 'Sin comentarios adicionales.'}</Text>
          </Section>
        </Section>
        
        <Section style={footer}>
          <Text style={footerText}>
            Este es un mensaje automático enviado desde el sitio web de Mar de Java.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default ContactEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const header = {
    padding: '32px',
    textAlign: 'center' as const,
    backgroundColor: '#000000',
};

const logo = {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: '700',
    letterSpacing: '4px',
    margin: '0',
};

const content = {
    padding: '40px 48px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  padding: '0',
  margin: '30px 0',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const detailsSection = {
    margin: '24px 0',
};

const sectionTitle = {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#999',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    marginBottom: '12px',
};

const row = {
    marginBottom: '8px',
};

const columnLabel = {
    width: '120px',
    fontSize: '14px',
    color: '#666',
    fontWeight: 'bold',
};

const columnValue = {
    fontSize: '14px',
    color: '#333',
};

const footer = {
  padding: '0 48px',
};

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
};
