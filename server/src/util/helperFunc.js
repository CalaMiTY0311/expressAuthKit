function createResponse(status, msg, data = null) {
    const response = {
        status,
        data: { msg }
    };

    if (data) {
        response.data = { ...response.data, ...data };
    }

    return response;
}

module.exports = { createResponse };