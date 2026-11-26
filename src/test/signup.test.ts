import { describe, expect, it } from 'vitest';
import { accountDestination, signupSchema } from '@/lib/signup';

const account = { full_name: 'Priya Sahu', email: 'priya@example.test', password: 'secure-pass', college_name: 'Example College', department: 'Science', teaching_subject: '', phone: '', study_year: '', roll_no: '', requested_role: 'student' };
describe('academic signup', () => {
  it('accepts separate admin, teacher and student requests', () => {
    for (const requested_role of ['admin', 'teacher', 'student']) {
      expect(signupSchema.parse({ ...account, requested_role, teaching_subject: 'Mathematics' }).requested_role).toBe(requested_role);
    }
  });
  it('requires college name', () => {
    expect(signupSchema.safeParse({ ...account, college_name: '' }).success).toBe(false);
  });
  it('requires teaching subject for teachers', () => {
    expect(signupSchema.safeParse({ ...account, requested_role: 'teacher' }).success).toBe(false);
    expect(signupSchema.safeParse({ ...account, requested_role: 'teacher', teaching_subject: 'Physics' }).success).toBe(true);
  });
  it('routes teachers to teaching tools and students to private attendance', () => {
    expect(accountDestination('teacher')).toBe('/admin');
    expect(accountDestination('student')).toBe('/student');
    expect(accountDestination(null)).toBe('/auth');
  });
});