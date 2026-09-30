import { Resend } from 'resend';
import ContactEmail from '@/components/emails/ContactEmail';
import { NextResponse } from 'next/server';
import config from '@/config/config';

export async function POST(request: Request) {
  try {
    // Initialize Resend inside the handler to avoid build-time errors
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const body = (await request.json()) as any;
    const { 
        nombres, 
        apellido, 
        email, 
        celular, 
        documentType, 
        documentNumber, 
        contactPreference, 
        horario,
        project,
        mensaje
    } = body;

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: config.resend.fromNoReply,
      to: config.resend.supportEmails,
      subject: `Nueva Solicitud: ${nombres} ${apellido}`,
      react: ContactEmail({
        nombres,
        apellido,
        email,
        celular,
        documentType,
        documentNumber,
        contactPreference,
        horario,
        project: project || config.company.buildingName,
        mensaje
      }),
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
