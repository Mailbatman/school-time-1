import { School, User } from '@prisma/client';

export type SchoolWithAdmin = School & { users: Pick<User, 'email'>[] };