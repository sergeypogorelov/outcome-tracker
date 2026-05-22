import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from './category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoriesRepository: Repository<CategoryEntity>,
  ) {}

  findByName(name: string): Promise<CategoryEntity | null> {
    return this.categoriesRepository.findOne({ where: { name } });
  }

  findAll(): Promise<CategoryEntity[]> {
    return this.categoriesRepository.find({ order: { name: 'ASC' } });
  }
}
