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
  Row,
  Column,
  Link,
} from '@react-email/components';
import config from '@/config/config';

interface AppointmentEmailProps {
  prospectName: string;
  prospectEmail: string;
  prospectPhone?: string;
  prospectAddress?: string;
  date: Date;
  type: 'VIRTUAL' | 'IN_PERSON';
  units: string[];
  sellerName: string;
  sellerEmail: string;
  isForSeller: boolean;
  meetLink?: string;
}

export const AppointmentEmail = ({
  prospectName,
  prospectEmail,
  prospectPhone,
  prospectAddress,
  date,
  type,
  units,
  sellerName,
  sellerEmail,
  isForSeller,
  meetLink,
}: AppointmentEmailProps) => {
  const formattedDate = new Date(date).toLocaleString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const projectName = config.company?.buildingName || 'Residencial Mar de Java';
  const buildingAddress = config.company?.buildingAddress || config.company?.address || '';
  const googleMapsUrl = buildingAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(buildingAddress)}`
    : '';

  const subjectText = isForSeller
    ? `Nueva Cita Agendada - ${prospectName}`
    : `Confirmación de Cita - ${projectName}`;

  return (
    <Html>
      <Head />
      <Preview>{subjectText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>{projectName.toUpperCase()}</Text>
          </Section>

          <Section style={content}>
            <Heading style={h1}>
              {isForSeller ? 'Nueva Cita Asignada' : '¡Tu cita está confirmada!'}
            </Heading>
            <Text style={text}>
              {isForSeller
                ? `Hola ${sellerName}, se te ha asignado una nueva cita en la plataforma.`
                : `Hola ${prospectName}, gracias por reservar una cita con nosotros. A continuación, te compartimos los detalles de tu reunión para conocer el proyecto ${projectName}.`}
            </Text>

            <Hr style={hr} />

            <Section style={detailsSection}>
              <Text style={sectionTitle}>Detalles de la Cita</Text>

              <Row style={row}>
                <Column style={columnLabel}>Fecha y Hora:</Column>
                <Column style={columnValue}>{formattedDate}</Column>
              </Row>

              <Row style={row}>
                <Column style={columnLabel}>Tipo de Cita:</Column>
                <Column style={columnValue}>
                  {type === 'IN_PERSON' ? 'Presencial' : 'Virtual'}
                </Column>
              </Row>

              <Row style={row}>
                <Column style={columnLabel}>Lugar/Medio:</Column>
                <Column style={columnValue}>
                  {type === 'IN_PERSON' ? (
                    buildingAddress ? (
                      <Link href={googleMapsUrl} style={link}>
                        {buildingAddress} (Ver en Google Maps)
                      </Link>
                    ) : (
                      'Presencial (Dirección de la sala de ventas)'
                    )
                  ) : (
                    meetLink ? (
                      <Link href={meetLink} style={linkButton}>
                        Unirse a Google Meet
                      </Link>
                    ) : (
                      'Reunión Virtual (El asesor se contactará para coordinar el enlace)'
                    )
                  )}
                </Column>
              </Row>

              {units && units.length > 0 && (
                <Row style={row}>
                  <Column style={columnLabel}>Unidad(es) de Interés:</Column>
                  <Column style={columnValue}>{units.join(', ')}</Column>
                </Row>
              )}
            </Section>

            <Hr style={hr} />

            <Section style={detailsSection}>
              <Text style={sectionTitle}>
                {isForSeller ? 'Información del Prospecto' : 'Tu Asesor Asignado'}
              </Text>

              {isForSeller ? (
                <>
                  <Row style={row}>
                    <Column style={columnLabel}>Nombre:</Column>
                    <Column style={columnValue}>{prospectName}</Column>
                  </Row>
                  <Row style={row}>
                    <Column style={columnLabel}>Correo:</Column>
                    <Column style={columnValue}>{prospectEmail}</Column>
                  </Row>
                  {prospectPhone && (
                    <Row style={row}>
                      <Column style={columnLabel}>Celular:</Column>
                      <Column style={columnValue}>{prospectPhone}</Column>
                    </Row>
                  )}
                  {prospectAddress && (
                    <Row style={row}>
                      <Column style={columnLabel}>Dirección:</Column>
                      <Column style={columnValue}>{prospectAddress}</Column>
                    </Row>
                  )}
                </>
              ) : (
                <>
                  <Row style={row}>
                    <Column style={columnLabel}>Asesor:</Column>
                    <Column style={columnValue}>{sellerName}</Column>
                  </Row>
                  <Row style={row}>
                    <Column style={columnLabel}>Correo:</Column>
                    <Column style={columnValue}>{sellerEmail}</Column>
                  </Row>
                </>
              )}
            </Section>

            {!isForSeller && (
              <>
                <Hr style={hr} />
                <Text style={subtext}>
                  Si necesitas reprogramar o cancelar esta cita, por favor ponte en contacto con tu asesor directamente al correo {sellerEmail}.
                </Text>
              </>
            )}
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Este es un mensaje automático enviado desde el sitio web oficial de {projectName}.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default AppointmentEmail;

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

const subtext = {
  color: '#666',
  fontSize: '13px',
  lineHeight: '18px',
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
  width: '150px',
  fontSize: '14px',
  color: '#666',
  fontWeight: 'bold',
  verticalAlign: 'top',
};

const columnValue = {
  fontSize: '14px',
  color: '#333',
  verticalAlign: 'top',
};

const link = {
  color: '#F59C1D',
  textDecoration: 'underline',
};

const linkButton = {
  color: '#ffffff',
  backgroundColor: '#F59C1D',
  padding: '8px 14px',
  borderRadius: '4px',
  textDecoration: 'none',
  display: 'inline-block',
  fontWeight: 'bold',
  fontSize: '12px',
};

const footer = {
  padding: '0 48px',
};

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
};
