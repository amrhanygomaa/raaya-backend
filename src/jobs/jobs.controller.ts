import { Controller, Post, Headers, UnauthorizedException } from '@nestjs/common';

@Controller('jobs')
export class JobsController {
    @Post('medication-reminder')
    runMedicationReminder(@Headers('x-job-secret') secret: string) {
        if (secret !== process.env.JOB_SECRET) {
            throw new UnauthorizedException('Invalid job secret');
        }
        return {
            status: 'ok',
            job: 'medication-reminder',
            timestamp: new Date().toISOString()
        };
    }
}