import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';

export interface TelegramUserInput {
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async findOrCreateTelegramUser(input: TelegramUserInput): Promise<UserEntity> {
    const existing = await this.usersRepository.findOne({
      where: { telegramId: input.telegramId },
    });

    if (existing) {
      existing.username = input.username ?? existing.username;
      existing.firstName = input.firstName ?? existing.firstName;
      return this.usersRepository.save(existing);
    }

    return this.usersRepository.save(this.usersRepository.create(input));
  }
}
