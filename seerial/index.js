const { SerialPort } = require('serialport');

/**
 * 一个用于管理串口通信的类
 * 支持发送和接收字符串及二进制数据
 */
class SerialPortHandler {
    /**
     * 创建一个串口管理器实例
     * @param {string} portPath - 串口设备路径 (例如: '/dev/ttyAMA0', '/dev/ttyUSB0')
     * @param {object} options - 串口配置选项 (波特率、数据位等)
     */
    constructor(portPath, options = {}) {
        // 合并默认配置和用户自定义配置
        this.config = {
            baudRate: options.baudRate || 9600,
            dataBits: options.dataBits || 8,
            stopBits: options.stopBits || 1,
            parity: options.parity || 'none',
            autoOpen: false // 我们不自动打开，而是手动调用 .open()
        };

        this.portPath = portPath;
        this.serialPort = null;
        this.isConnected = false;

        // 绑定方法上下文，以便在事件回调中使用
        this.onDataReceived = this.onDataReceived.bind(this);
        this.onError = this.onError.bind(this);
        this.onClose = this.onClose.bind(this);
    }

    /**
     * 打开并连接串口
     * @returns {Promise<void>}
     */
    async open() {
        return new Promise((resolve, reject) => {
            if (this.isConnected) {
                resolve();
                return;
            }

            try {
                this.serialPort = new SerialPort({
                    path: this.portPath,
                    ...this.config
                });

                // 成功打开事件
                this.serialPort.on('open', () => {
                    console.log(`串口 ${this.portPath} 已成功打开`);
                    this.isConnected = true;
                    resolve();
                });

                // 数据接收事件
                this.serialPort.on('data', this.onDataReceived);

                // 错误事件
                this.serialPort.on('error', this.onError);

                // 关闭事件
                this.serialPort.on('close', this.onClose);

            } catch (error) {
                reject(new Error(`创建串口实例失败: ${error.message}`));
            }
        });
    }

    /**
     * 关闭串口连接
     * @returns {Promise<void>}
     */
    async close() {
        return new Promise((resolve) => {
            if (!this.serialPort || !this.isConnected) {
                resolve();
                return;
            }

            this.serialPort.close((error) => {
                if (error) {
                    console.error('关闭串口时发生错误:', error.message);
                } else {
                    console.log('串口已关闭');
                    this.isConnected = false;
                }
                resolve();
            });
        });
    }

    /**
     * 发送数据到串口
     * @param {string|Buffer} data - 要发送的数据（字符串或缓冲区）
     * @param {string} encoding - 字符串编码格式 (默认 'utf8')
     * @returns {Promise<void>}
     */
    async sendData(data, encoding = 'utf8') {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('串口未连接，请先调用 open() 方法'));
                return;
            }

            // 如果输入是字符串，则转换为Buffer
            const bufferData = typeof data === 'string' ? Buffer.from(data, encoding) : data;

            this.serialPort.write(bufferData, (error) => {
                if (error) {
                    reject(new Error(`发送数据失败: ${error.message}`));
                } else {
                    // 可选：确保数据完全写入（特别是在硬件流控制时）
                    this.serialPort.drain(() => {
                        console.log(`数据已发送: ${data.toString()}`);
                        resolve();
                    });
                }
            });
        });
    }

    /**
     * 处理接收到的数据（默认转换为字符串）
     * @param {Buffer} data - 接收到的原始数据缓冲区
     */
    onDataReceived(data) {
        // 默认将接收到的数据转换为字符串
        const receivedString = data.toString('utf8');
        console.log(`接收到数据: ${receivedString}`);

        // 触发自定义事件（如果有监听器的话）
        if (this.onDataCallback) {
            this.onDataCallback(receivedString, data);
        }
    }

    /**
     * 处理错误事件
     * @param {Error} error - 错误对象
     */
    onError(error) {
        console.error('串口错误:', error.message);
        this.isConnected = false;

        if (this.onErrorCallback) {
            this.onErrorCallback(error);
        }
    }

    /**
     * 处理连接关闭事件
     */
    onClose() {
        console.log('串口连接已关闭');
        this.isConnected = false;

        if (this.onCloseCallback) {
            this.onCloseCallback();
        }
    }

    /**
     * 设置数据接收回调函数
     * @param {Function} callback - 回调函数 (data: string, rawData: Buffer) => void
     */
    setOnDataCallback(callback) {
        this.onDataCallback = callback;
    }

    /**
     * 设置错误回调函数
     * @param {Function} callback - 回调函数 (error: Error) => void
     */
    setOnErrorCallback(callback) {
        this.onErrorCallback = callback;
    }

    /**
     * 设置连接关闭回调函数
     * @param {Function} callback - 回调函数 () => void
     */
    setOnCloseCallback(callback) {
        this.onCloseCallback = callback;
    }

    /**
     * 获取当前连接状态
     * @returns {boolean} 是否已连接
     */
    getIsConnected() {
        return this.isConnected;
    }
}

module.exports = SerialPortHandler;
