#!/usr/bin/env bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Demo Backend Setup Script ===${NC}\n"

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}Error: Bun is not installed${NC}"
    echo "Please install Bun first: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo -e "${GREEN}✓ Bun is installed${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    echo "Copying .env.example to .env..."
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo -e "${YELLOW}⚠ Please update .env with your actual configuration${NC}\n"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Install dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
bun install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

# Generate migrations
echo -e "\n${YELLOW}Generating database migrations...${NC}"
bun run db:generate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migrations generated successfully${NC}"
else
    echo -e "${YELLOW}⚠ Migration generation skipped or failed${NC}"
fi

# Ask if user wants to run migrations
echo -e "\n${YELLOW}Do you want to run database migrations now? (y/N)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo -e "${YELLOW}Running migrations...${NC}"
    bun run db:migrate
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migrations completed successfully${NC}"
    else
        echo -e "${RED}✗ Migration failed${NC}"
        echo "Please check your database connection settings in .env"
    fi
else
    echo -e "${YELLOW}Skipping migrations. Run 'bun run db:migrate' when ready.${NC}"
fi

echo -e "\n${GREEN}=== Setup Complete! ===${NC}"
echo -e "\nNext steps:"
echo -e "  1. Update .env with your database credentials"
echo -e "  2. Run migrations: ${YELLOW}bun run db:migrate${NC}"
echo -e "  3. Start the server: ${YELLOW}bun run dev${NC}"
echo -e "\nServer will be available at: ${GREEN}http://localhost:3000${NC}"
echo -e "Health check: ${GREEN}http://localhost:3000/health${NC}\n"
