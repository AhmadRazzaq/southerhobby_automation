const express = require("express");
const { chromium } = require("playwright");
const axios = require("axios");

const app = express();
app.use(express.json());

app.post("/run-southern", async (req, res) => {
    let browser;

    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error: "Email and password are required"
        });
    }

    try {
        browser = await chromium.launch({ headless: true });

        const context = await browser.newContext();
        const page = await context.newPage();

        console.log("Opening spreadsheet page...");

        await page.goto(
            "https://www.southernhobby.com/product_spreadsheet.php",
            { waitUntil: "domcontentloaded" }
        );

        // Check if login page appears
        const emailField = await page.$('input[name="email_address"]');

        if (emailField) {
            console.log("Login required. Logging in...");

            await page.fill('input[name="email_address"]', email);
            await page.fill('input[name="password"]', password);

            await Promise.all([
                page.waitForNavigation(),
                page.click('input[name="login"]')
            ]);

            console.log("Logged in successfully.");
        }

        // Wait briefly for page to load fully
        await page.waitForTimeout(2000);

        const linkElement = await page.$("#link");

        if (!linkElement) {
            throw new Error("Download link not found after login.");
        }

        const hrefValue = await linkElement.getAttribute("href");

        if (!hrefValue) {
            throw new Error("Download link has no href.");
        }

        console.log("Found href:", hrefValue);

        // Extract file name
        const match = hrefValue.match(/download\('(.+?)'\)/);

        if (!match) {
            throw new Error("Could not extract filename.");
        }

        const fullPath = match[1];
        const fileName = fullPath.split("/").pop();

        console.log("Extracted file name:", fileName);

        // Send filename to external API
        const apiResponse = await axios.post(
            "https://codewithninja.com/southern.php",
            new URLSearchParams({
                FileName: fileName
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }
        );

        res.json({
            success: true,
            fileName,
            apiResponse: apiResponse.data
        });

    } catch (error) {
        console.error("Error:", error.message);

        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});