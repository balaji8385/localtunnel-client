import winston from 'winston';

function createLogger(): winston.Logger {
    const logFormat = winston.format.printf((info) => {
        const { level, message, timestamp, ...rest } = info;
        
        // Construct the base message
        let logMessage = `${timestamp} [${level}]: ${message}`;
        
        // Append any additional metadata
        const metadata = Object.keys(rest);
        if (metadata.length > 0) {
            const metaString = metadata
                .filter(key => key !== 'level' && key !== 'message' && key !== 'timestamp')
                .map(key => JSON.stringify(rest[key]))
                .join(' ');
            if (metaString) {
                logMessage += ` ${metaString}`;
            }
        }
        
        return logMessage;
    });

    return winston.createLogger({
        level: 'debug', // default log level
        format: winston.format.combine(
            winston.format.timestamp(),
            logFormat
        ),
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    logFormat
                )
            }),
        ]
    });
}

const logger = createLogger();

export default logger;
