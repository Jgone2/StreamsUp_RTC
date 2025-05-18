import { Controller } from '@nestjs/common';
import { PrismaService } from './prisma.service';
@Controller('prisma')
export class PrismaController {
  constructor(private readonly prismaService: PrismaService) {}

  // @Post()
  // create(@Body() createPrismaDto: CreatePrismaDto) {
  //   return this.prismaService.create(createPrismaDto);
  // }
  //
  // @Get()
  // findAll() {
  //   return this.prismaService.findAll();
  // }
  //
  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.prismaService.findOne(+id);
  // }
  //
  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updatePrismaDto: UpdatePrismaDto) {
  //   return this.prismaService.update(+id, updatePrismaDto);
  // }
  //
  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.prismaService.remove(+id);
  // }
}
