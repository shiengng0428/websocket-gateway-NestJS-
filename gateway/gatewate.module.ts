import { Module } from '@nestjs/common';
import { MyGateway } from './note.gateway';
import { GatewayService } from './gateway.service';
import { GatewayController } from './gateway.controller';

@Module({
    controllers: [GatewayController],
    providers: [MyGateway, GatewayService],
    exports: [GatewayModule],
})
export class GatewayModule { }


