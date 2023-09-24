import { rb } from '@flexsolver/rbts';
import { Controller, Post, Body, UseGuards, Delete, Get, Param, Put } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { GatewayService } from './gateway.service';


/**
 * 15.1.14 Display Room User(Websocket)
 */
@UseGuards(JwtAuthGuard)
@Controller('wiki_note')
export class GatewayController {
    constructor(private readonly GatewayService: GatewayService) { }

    @Get('/:id')
    async displayUser(@Param('id') id: string) {
        try {
            let roomName = "ROOM " + id;
            let roomDetail = await this.GatewayService.retrieveSpecificRoomData(roomName);
            return rb().build(roomDetail);
        } catch (error) {
            throw error;
        }
    }
}