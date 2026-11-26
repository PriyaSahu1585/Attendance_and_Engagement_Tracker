import { z } from 'zod';

export const signupSchema = z.object({
  full_name: z.string().trim().min(1, 'Enter your full name').max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(6, 'Use at least 6 characters').max(128),
  requested_role: z.enum(['admin', 'teacher', 'student']),
  college_name: z.string().trim().min(1, 'Enter your college name').max(160),
  department: z.string().trim().max(100),
  teaching_subject: z.string().trim().max(160),
  roll_no: z.string().trim().max(50),
  phone: z.string().trim().max(30).refine(v => !v || /^[+\d\s()-]+$/.test(v), 'Enter a valid phone number'),
  study_year: z.string().trim().max(30),
}).superRefine((value, ctx) => {
  if (value.requested_role === 'teacher' && !value.teaching_subject)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['teaching_subject'], message: 'Enter the subject you teach' });
});

export const profileSchema = z.object({
  full_name: z.string().trim().min(1).max(100),
  college_name: z.string().trim().min(1).max(160),
  department: z.string().trim().max(100),
  teaching_subject: z.string().trim().max(160),
  phone: z.string().trim().max(30).refine(v => !v || /^[+\d\s()-]+$/.test(v), 'Enter a valid phone number'),
  roll_no: z.string().trim().max(50),
  study_year: z.string().trim().max(30),
});

export function accountDestination(role: 'admin' | 'teacher' | 'student' | null) {
  return role === 'admin' || role === 'teacher' ? '/admin' : role === 'student' ? '/student' : '/auth';
}